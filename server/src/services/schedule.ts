import { one, nowIso, parseSqlDate, query, run } from '../db/index.js';
import { id } from '../lib/ids.js';
import { HttpError } from '../lib/http-error.js';
import { DAY_NAMES, localParts, zonedToUtc } from '../lib/timezone.js';

interface ScheduleRow {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  reminder_minutes: number;
  active: number;
  created_at: Date;
}

export interface ScheduleInput {
  title: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  reminderMinutes: number;
  courseId?: string | null;
  active?: boolean;
}

export interface Occurrence {
  scheduleId: string;
  title: string;
  courseId: string | null;
  courseTitle: string | null;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  durationMinutes: number;
  reminderMinutes: number;
  /** ISO instant the session starts. */
  startsAt: string;
  endsAt: string;
  /** ISO instant the reminder becomes due. */
  remindAt: string;
  minutesUntilStart: number;
  /** True while the reminder window is open and the session has not finished. */
  alertDue: boolean;
  inProgress: boolean;
  acknowledged: boolean;
}

async function loadSchedule(userId: string, scheduleId: string): Promise<ScheduleRow> {
  const row = await one<ScheduleRow>('SELECT * FROM study_schedules WHERE id = ?', scheduleId);
  if (!row) throw HttpError.notFound('That schedule entry does not exist.');
  if (row.user_id !== userId) throw HttpError.forbidden('That schedule entry belongs to another learner.');
  return row;
}

function parseTime(startTime: string): { hour: number; minute: number } {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(startTime);
  if (!match) throw HttpError.badRequest('Start time must be in 24-hour HH:MM format.');
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export async function createSchedule(userId: string, timeZone: string, input: ScheduleInput) {
  parseTime(input.startTime);

  if (input.courseId) {
    const course = await one('SELECT id FROM courses WHERE id = ?', input.courseId);
    if (!course) throw HttpError.badRequest('That course does not exist.');
  }

  const scheduleId = id('sch');
  await run(
    `INSERT INTO study_schedules
       (id, user_id, course_id, title, day_of_week, start_time, duration_minutes, reminder_minutes, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    scheduleId,
    userId,
    input.courseId ?? null,
    input.title.trim(),
    input.dayOfWeek,
    input.startTime,
    input.durationMinutes,
    input.reminderMinutes,
    input.active === false ? 0 : 1,
  );

  return (await listSchedules(userId, timeZone)).find((entry) => entry.id === scheduleId)!;
}

export async function updateSchedule(
  userId: string,
  timeZone: string,
  scheduleId: string,
  input: Partial<ScheduleInput>,
) {
  const existing = await loadSchedule(userId, scheduleId);
  if (input.startTime) parseTime(input.startTime);

  await run(
    `UPDATE study_schedules
        SET title = ?, day_of_week = ?, start_time = ?, duration_minutes = ?,
            reminder_minutes = ?, course_id = ?, active = ?
      WHERE id = ?`,
    input.title?.trim() ?? existing.title,
    input.dayOfWeek ?? existing.day_of_week,
    input.startTime ?? existing.start_time,
    input.durationMinutes ?? existing.duration_minutes,
    input.reminderMinutes ?? existing.reminder_minutes,
    input.courseId === undefined ? existing.course_id : input.courseId,
    input.active === undefined ? existing.active : input.active ? 1 : 0,
    scheduleId,
  );

  return (await listSchedules(userId, timeZone)).find((entry) => entry.id === scheduleId)!;
}

export async function deleteSchedule(userId: string, scheduleId: string) {
  await loadSchedule(userId, scheduleId);
  await run('DELETE FROM study_schedules WHERE id = ?', scheduleId);
  return { id: scheduleId, deleted: true };
}

export async function listSchedules(userId: string, timeZone: string) {
  const rows = await query<ScheduleRow & { course_title: string | null }>(
    `SELECT s.*, c.title AS course_title
       FROM study_schedules s
       LEFT JOIN courses c ON c.id = s.course_id
      WHERE s.user_id = ?
      ORDER BY s.day_of_week, s.start_time`,
    userId,
  );

  return rows.map((row) => {
    const next = nextOccurrence(row, timeZone);
    return {
      id: row.id,
      title: row.title,
      courseId: row.course_id,
      courseTitle: row.course_title,
      dayOfWeek: row.day_of_week,
      dayName: DAY_NAMES[row.day_of_week],
      startTime: row.start_time,
      durationMinutes: row.duration_minutes,
      reminderMinutes: row.reminder_minutes,
      active: row.active === 1,
      timeZone,
      nextOccurrence: next ? next.toISOString() : null,
    };
  });
}

/** The next start instant for a schedule, searching forward up to two weeks. */
function nextOccurrence(row: ScheduleRow, timeZone: string, from = new Date()): Date | null {
  if (row.active !== 1) return null;
  const { hour, minute } = parseTime(row.start_time);

  for (let offset = 0; offset <= 14; offset += 1) {
    const probe = new Date(from.getTime() + offset * 86_400_000);
    const local = localParts(probe, timeZone);
    if (local.dayOfWeek !== row.day_of_week) continue;

    const start = zonedToUtc(local.year, local.month, local.day, hour, minute, timeZone);
    if (start.getTime() + row.duration_minutes * 60_000 > from.getTime()) return start;
  }

  return null;
}

/**
 * Every occurrence within the horizon, annotated with whether its reminder is
 * currently due. The client polls this and raises the alert, so a learner who
 * has the tab open is notified without a push subscription.
 */
export async function upcomingOccurrences(
  userId: string,
  timeZone: string,
  horizonDays = 7,
): Promise<Occurrence[]> {
  const rows = await query<ScheduleRow & { course_title: string | null }>(
    `SELECT s.*, c.title AS course_title
       FROM study_schedules s
       LEFT JOIN courses c ON c.id = s.course_id
      WHERE s.user_id = ? AND s.active = 1`,
    userId,
  );

  const now = Date.now();
  const horizon = now + horizonDays * 86_400_000;
  const acknowledged = new Set(
    (
      await query<{ occurrence: string }>(
        'SELECT occurrence FROM schedule_alerts WHERE user_id = ? AND acknowledged_at IS NOT NULL',
        userId,
      )
    ).map((row) => row.occurrence),
  );

  const occurrences: Occurrence[] = [];

  for (const row of rows) {
    const { hour, minute } = parseTime(row.start_time);

    for (let offset = 0; offset <= horizonDays; offset += 1) {
      const probe = new Date(now + offset * 86_400_000);
      const local = localParts(probe, timeZone);
      if (local.dayOfWeek !== row.day_of_week) continue;

      const start = zonedToUtc(local.year, local.month, local.day, hour, minute, timeZone);
      const end = new Date(start.getTime() + row.duration_minutes * 60_000);
      if (end.getTime() < now || start.getTime() > horizon) continue;

      const remindAt = new Date(start.getTime() - row.reminder_minutes * 60_000);
      const key = `${row.id}:${start.toISOString()}`;

      occurrences.push({
        scheduleId: row.id,
        title: row.title,
        courseId: row.course_id,
        courseTitle: row.course_title,
        dayOfWeek: row.day_of_week,
        dayName: DAY_NAMES[row.day_of_week],
        startTime: row.start_time,
        durationMinutes: row.duration_minutes,
        reminderMinutes: row.reminder_minutes,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        remindAt: remindAt.toISOString(),
        minutesUntilStart: Math.round((start.getTime() - now) / 60_000),
        alertDue: now >= remindAt.getTime() && now < end.getTime() && !acknowledged.has(key),
        inProgress: now >= start.getTime() && now < end.getTime(),
        acknowledged: acknowledged.has(key),
      });
    }
  }

  return occurrences.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Silences one occurrence so the alert does not reappear on the next poll. */
export async function acknowledgeAlert(userId: string, scheduleId: string, occurrenceIso: string) {
  await loadSchedule(userId, scheduleId);
  const key = `${scheduleId}:${occurrenceIso}`;

  await run(
    `INSERT INTO schedule_alerts (id, schedule_id, user_id, occurrence, acknowledged_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (schedule_id, occurrence) DO UPDATE SET acknowledged_at = excluded.acknowledged_at`,
    id('alr'),
    scheduleId,
    userId,
    key,
    nowIso(),
  );

  return { scheduleId, occurrence: occurrenceIso, acknowledged: true };
}

/** A sensible starter routine created alongside a new account. */
export async function seedDefaultSchedule(
  userId: string,
  courseId: string | null,
  weeklyHours: number,
): Promise<void> {
  const sessionsPerWeek = Math.max(2, Math.min(5, Math.round(weeklyHours / 1.5)));
  const preferredDays = [1, 3, 5, 2, 6];
  const durationMinutes = Math.max(45, Math.min(120, Math.round((weeklyHours * 60) / sessionsPerWeek)));

  for (let index = 0; index < sessionsPerWeek; index += 1) {
    await run(
      `INSERT INTO study_schedules
         (id, user_id, course_id, title, day_of_week, start_time, duration_minutes, reminder_minutes, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      id('sch'),
      userId,
      courseId,
      'Study session',
      preferredDays[index % preferredDays.length],
      index % 2 === 0 ? '19:00' : '18:30',
      durationMinutes,
      15,
    );
  }
}

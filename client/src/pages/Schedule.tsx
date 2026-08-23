import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../lib/api';
import type { CourseSummary, Occurrence, ScheduleEntry } from '../lib/types';
import { dateTimeLabel } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertContext';
import { Badge, Button, Callout, EmptyState, Field, PageHeader, Select, Skeleton, TextInput } from '../components/ui';
import { Icon } from '../components/Icon';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const BLANK = {
  title: 'Study session',
  dayOfWeek: 1,
  startTime: '19:00',
  durationMinutes: 60,
  reminderMinutes: 15,
  courseId: '',
};

export default function Schedule() {
  const { user } = useAuth();
  const { notificationsEnabled, requestNotifications, refresh: refreshAlerts } = useAlerts();

  const [schedules, setSchedules] = useState<ScheduleEntry[] | null>(null);
  const [upcoming, setUpcoming] = useState<Occurrence[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [payload, catalog] = await Promise.all([
        api.get<{ schedules: ScheduleEntry[]; upcoming: Occurrence[] }>('/schedule'),
        api.get<{ courses: CourseSummary[] }>('/learning/courses'),
      ]);
      setSchedules(payload.schedules);
      setUpcoming(payload.upcoming);
      setCourses(catalog.courses.filter((course) => course.enrolled));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Your schedule could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function beginEdit(entry: ScheduleEntry) {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      durationMinutes: entry.durationMinutes,
      reminderMinutes: entry.reminderMinutes,
      courseId: entry.courseId ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm(BLANK);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const body = { ...form, courseId: form.courseId || null };

    try {
      if (editingId) {
        await api.patch(`/schedule/${editingId}`, body);
      } else {
        await api.post('/schedule', body);
      }
      resetForm();
      await load();
      await refreshAlerts();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The session could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(entry: ScheduleEntry) {
    try {
      await api.patch(`/schedule/${entry.id}`, { active: !entry.active });
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That change could not be saved.');
    }
  }

  async function remove(entry: ScheduleEntry) {
    try {
      await api.delete(`/schedule/${entry.id}`);
      if (editingId === entry.id) resetForm();
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That session could not be deleted.');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Study routine"
        title="Schedule"
        description={`Weekly study blocks in ${user?.timezone ?? 'your time zone'}. You are alerted before each one, and the reminder survives a page reload.`}
      />

      {!notificationsEnabled ? (
        <div className="panel mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-slate-400">
              <Icon name="bell" size={17} />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-200">Enable desktop notifications</p>
              <p className="mt-0.5 text-sm text-slate-500">
                Get alerted when a session is about to start, even when this tab is in the background.
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => void requestNotifications()}>
            Allow notifications
          </Button>
        </div>
      ) : null}

      {error ? (
        <div className="mb-5">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Weekly sessions</h2>

          {!schedules ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24" />
              ))}
            </div>
          ) : schedules.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No study sessions scheduled"
              description="Add a weekly block and you will be reminded before it starts."
            />
          ) : (
            <ul className="space-y-3">
              {schedules.map((entry) => (
                <li key={entry.id} className={`panel p-5 ${entry.active ? '' : 'opacity-60'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">{entry.title}</h3>
                        {!entry.active ? <Badge>Paused</Badge> : null}
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Icon name="calendar" size={13} />
                          {entry.dayName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Icon name="clock" size={13} />
                          {entry.startTime} · {entry.durationMinutes} min
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Icon name="bell" size={13} />
                          {entry.reminderMinutes} min before
                        </span>
                      </p>
                      {entry.courseTitle ? (
                        <p className="mt-1.5 text-xs text-slate-500">{entry.courseTitle}</p>
                      ) : null}
                      {entry.nextOccurrence ? (
                        <p className="mt-2 text-xs text-brand-300">
                          Next: {dateTimeLabel(entry.nextOccurrence, user?.timezone)}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => beginEdit(entry)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void toggleActive(entry)}>
                        {entry.active ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="trash"
                        aria-label={`Delete ${entry.title}`}
                        onClick={() => void remove(entry)}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {upcoming.length > 0 ? (
            <section className="panel mt-6 p-5">
              <h2 className="mb-4 text-sm font-semibold text-white">Next seven days</h2>
              <ul className="divide-y divide-ink-800">
                {upcoming.slice(0, 8).map((occurrence) => (
                  <li
                    key={`${occurrence.scheduleId}:${occurrence.startsAt}`}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        occurrence.inProgress
                          ? 'bg-emerald-500/12 text-emerald-300'
                          : 'bg-ink-800 text-slate-400'
                      }`}
                    >
                      <Icon name={occurrence.inProgress ? 'play' : 'clock'} size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">{occurrence.title}</p>
                      <p className="text-xs text-slate-500">
                        {dateTimeLabel(occurrence.startsAt, user?.timezone)}
                      </p>
                    </div>
                    {occurrence.inProgress ? (
                      <Badge tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Now</Badge>
                    ) : (
                      <span className="text-xs text-slate-500">
                        in {formatLead(occurrence.minutesUntilStart)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>

        <aside>
          <form onSubmit={handleSubmit} className="panel sticky top-6 space-y-5 p-5">
            <h2 className="text-sm font-semibold text-white">
              {editingId ? 'Edit session' : 'Add a study session'}
            </h2>

            <Field label="Name" htmlFor="title" required>
              <TextInput
                id="title"
                value={form.title}
                onChange={(event) => set('title', event.target.value)}
                required
              />
            </Field>

            <Field label="Course" htmlFor="courseId" hint="Optional — links the session to a course.">
              <Select
                id="courseId"
                value={form.courseId}
                onChange={(event) => set('courseId', event.target.value)}
              >
                <option value="">No specific course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Day" htmlFor="dayOfWeek" required>
                <Select
                  id="dayOfWeek"
                  value={form.dayOfWeek}
                  onChange={(event) => set('dayOfWeek', Number(event.target.value))}
                >
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Start time" htmlFor="startTime" required>
                <TextInput
                  id="startTime"
                  type="time"
                  value={form.startTime}
                  onChange={(event) => set('startTime', event.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Duration" htmlFor="durationMinutes" required>
                <Select
                  id="durationMinutes"
                  value={form.durationMinutes}
                  onChange={(event) => set('durationMinutes', Number(event.target.value))}
                >
                  {[30, 45, 60, 90, 120, 180].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutes
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Remind me" htmlFor="reminderMinutes" required>
                <Select
                  id="reminderMinutes"
                  value={form.reminderMinutes}
                  onChange={(event) => set('reminderMinutes', Number(event.target.value))}
                >
                  {[0, 5, 10, 15, 30, 60].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes === 0 ? 'At start time' : `${minutes} min before`}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="flex gap-2 border-t border-ink-800 pt-4">
              <Button type="submit" loading={saving} block>
                {editingId ? 'Save changes' : 'Add session'}
              </Button>
              {editingId ? (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </aside>
      </div>
    </>
  );
}

function formatLead(minutes: number): string {
  if (minutes < 60) return `${Math.max(0, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hr`;
  return `${Math.round(hours / 24)} days`;
}

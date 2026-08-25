import { config } from '../config.js';
import { one, nowIso, parseSqlDate, query, run, toIso, transaction } from '../db/index.js';
import { id } from '../lib/ids.js';
import { HttpError } from '../lib/http-error.js';

export type ProgressState =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'STUDYING'
  | 'EXAM_READY'
  | 'REWARD_READY'
  | 'REWARD_ACTIVE'
  | 'COMPLETED';

interface ChapterRow {
  id: string;
  course_id: string;
  position: number;
  title: string;
  summary: string;
  content: string;
  estimated_minutes: number;
  pass_mark: number;
  reward_minutes: number;
}

interface ProgressRow {
  id: string;
  enrollment_id: string;
  chapter_id: string;
  state: ProgressState;
  study_started_at: Date | null;
  study_seconds: number;
  attempts: number;
  best_score: number;
  passed_at: Date | null;
  completed_at: Date | null;
  cooldown_until: Date | null;
}

interface EnrollmentRow {
  id: string;
  user_id: string;
  course_id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  completed_at: Date | null;
  created_at: Date;
}

export interface RewardSessionRow {
  id: string;
  user_id: string;
  chapter_id: string;
  attempt_id: string | null;
  minutes_granted: number;
  movie_id: string | null;
  movie_title: string | null;
  movie_source: string | null;
  movie_stream_url: string | null;
  movie_poster: string | null;
  status: 'GRANTED' | 'ACTIVE' | 'EXPIRED' | 'ENDED' | 'FORFEITED';
  granted_at: Date;
  started_at: Date | null;
  expires_at: Date | null;
  ended_at: Date | null;
  seconds_watched: number;
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------

export async function enroll(userId: string, courseId: string): Promise<EnrollmentRow> {
  const course = await one<{ id: string }>(
    'SELECT id FROM courses WHERE id = ? AND published = 1',
    courseId,
  );
  if (!course) throw HttpError.notFound('That course is not available.');

  const existing = await one<EnrollmentRow>(
    'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
    userId,
    courseId,
  );
  if (existing) return existing;

  return transaction(async () => {
    const enrollmentId = id('enr');
    await run('INSERT INTO enrollments (id, user_id, course_id) VALUES (?, ?, ?)', enrollmentId, userId, courseId);

    const chapters = await query<{ id: string; position: number }>(
      'SELECT id, position FROM chapters WHERE course_id = ? ORDER BY position',
      courseId,
    );

    if (chapters.length === 0) {
      throw HttpError.conflict('That course has no published chapters yet.');
    }

    // Only the first chapter opens; everything after it is gated behind an exam.
    for (const chapter of chapters) {
      await run(
        'INSERT INTO chapter_progress (id, enrollment_id, chapter_id, state) VALUES (?, ?, ?, ?)',
        id('prg'),
        enrollmentId,
        chapter.id,
        chapter.position === 0 ? 'AVAILABLE' : 'LOCKED',
      );
    }

    return (await one<EnrollmentRow>('SELECT * FROM enrollments WHERE id = ?', enrollmentId))!;
  });
}

// ---------------------------------------------------------------------------
// Context resolution
// ---------------------------------------------------------------------------

export interface ChapterContext {
  chapter: ChapterRow;
  enrollment: EnrollmentRow;
  progress: ProgressRow;
}

export async function chapterContext(userId: string, chapterId: string): Promise<ChapterContext> {
  const chapter = await one<ChapterRow>('SELECT * FROM chapters WHERE id = ?', chapterId);
  if (!chapter) throw HttpError.notFound('That chapter does not exist.');

  const enrollment = await one<EnrollmentRow>(
    'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?',
    userId,
    chapter.course_id,
  );
  if (!enrollment) throw HttpError.forbidden('Enroll in this course before opening its chapters.');

  const progress = await one<ProgressRow>(
    'SELECT * FROM chapter_progress WHERE enrollment_id = ? AND chapter_id = ?',
    enrollment.id,
    chapter.id,
  );
  if (!progress) throw HttpError.notFound('No progress record exists for that chapter.');

  return { chapter, enrollment, progress };
}

/** Column names are internal constants here, never user input. */
async function setState(
  progressId: string,
  state: ProgressState,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const columns = Object.keys(extra);
  const assignments = ['state = ?', 'updated_at = ?', ...columns.map((column) => `${column} = ?`)];
  const values = [state, nowIso(), ...columns.map((column) => extra[column]), progressId];

  await run(`UPDATE chapter_progress SET ${assignments.join(', ')} WHERE id = ?`, ...values);
}

// ---------------------------------------------------------------------------
// Study
// ---------------------------------------------------------------------------

const OPEN_STATES: ProgressState[] = [
  'AVAILABLE',
  'STUDYING',
  'EXAM_READY',
  'REWARD_READY',
  'REWARD_ACTIVE',
  'COMPLETED',
];

export async function beginStudy(userId: string, chapterId: string) {
  const { progress } = await chapterContext(userId, chapterId);

  if (progress.state === 'LOCKED') {
    throw HttpError.forbidden('Pass the previous chapter exam to unlock this chapter.');
  }

  // Re-opening a chapter that is already past the study gate must not reset it.
  if (progress.state === 'AVAILABLE') {
    await setState(progress.id, 'STUDYING', { study_started_at: nowIso() });
  } else if (progress.state === 'STUDYING' && !progress.study_started_at) {
    await setState(progress.id, 'STUDYING', { study_started_at: nowIso() });
  }

  return studyStatus(userId, chapterId);
}

export async function studyStatus(userId: string, chapterId: string) {
  const { chapter, progress } = await chapterContext(userId, chapterId);
  const startedAt = parseSqlDate(progress.study_started_at);
  const elapsedSeconds = startedAt
    ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)) + progress.study_seconds
    : progress.study_seconds;

  const required = config.learning.minimumStudySeconds;
  const pastGate = ['EXAM_READY', 'REWARD_READY', 'REWARD_ACTIVE', 'COMPLETED'].includes(progress.state);

  return {
    chapterId: chapter.id,
    state: progress.state,
    elapsedSeconds,
    requiredSeconds: required,
    remainingSeconds: pastGate ? 0 : Math.max(0, required - elapsedSeconds),
    examUnlocked: pastGate || elapsedSeconds >= required,
    attempts: progress.attempts,
    bestScore: progress.best_score,
    passMark: chapter.pass_mark,
    rewardMinutes: chapter.reward_minutes,
  };
}

/** Marks the reading complete once the minimum dwell time has genuinely elapsed. */
export async function completeStudy(userId: string, chapterId: string) {
  const { progress } = await chapterContext(userId, chapterId);
  const status = await studyStatus(userId, chapterId);

  if (progress.state === 'LOCKED') {
    throw HttpError.forbidden('This chapter is still locked.');
  }
  if (!status.examUnlocked) {
    throw HttpError.badRequest(
      `Spend at least ${Math.ceil(status.requiredSeconds / 60)} minutes on this chapter before opening the exam.`,
      { remainingSeconds: status.remainingSeconds },
    );
  }

  if (progress.state === 'AVAILABLE' || progress.state === 'STUDYING') {
    await setState(progress.id, 'EXAM_READY', {
      study_seconds: status.elapsedSeconds,
      study_started_at: null,
    });
  }

  return studyStatus(userId, chapterId);
}

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

interface QuestionRow {
  id: string;
  chapter_id: string;
  position: number;
  prompt: string;
  options: string;
  correct_index: number;
  explanation: string;
}

export interface AttemptRow {
  id: string;
  user_id: string;
  chapter_id: string;
  started_at: Date;
  submitted_at: Date | null;
  expires_at: Date;
  score: number | null;
  pass_mark: number;
  passed: number | null;
  answers: string;
  question_order: string;
}

export async function startExam(userId: string, chapterId: string) {
  const { chapter, progress } = await chapterContext(userId, chapterId);

  if (!OPEN_STATES.includes(progress.state)) {
    throw HttpError.forbidden('This chapter is locked.');
  }
  if (progress.state === 'AVAILABLE' || progress.state === 'STUDYING') {
    const status = await studyStatus(userId, chapterId);
    if (!status.examUnlocked) {
      throw HttpError.forbidden('Finish studying this chapter before starting the exam.', {
        remainingSeconds: status.remainingSeconds,
      });
    }
    await setState(progress.id, 'EXAM_READY', {
      study_seconds: status.elapsedSeconds,
      study_started_at: null,
    });
  }

  const cooldownUntil = parseSqlDate(progress.cooldown_until);
  if (cooldownUntil && cooldownUntil.getTime() > Date.now()) {
    throw HttpError.tooManyRequests('Review the chapter before retrying. The next attempt opens shortly.', {
      retryAfterSeconds: Math.ceil((cooldownUntil.getTime() - Date.now()) / 1000),
    });
  }

  // Reuse an attempt that is still within its window rather than issuing a new one.
  const open = await one<AttemptRow>(
    `SELECT * FROM exam_attempts
      WHERE user_id = ? AND chapter_id = ? AND submitted_at IS NULL
      ORDER BY started_at DESC LIMIT 1`,
    userId,
    chapterId,
  );

  if (open) {
    const expiry = parseSqlDate(open.expires_at);
    if (expiry && expiry.getTime() > Date.now()) return presentAttempt(open);
    // Window elapsed: grade whatever was recorded so the attempt is not left dangling.
    await gradeAttempt(open, JSON.parse(open.answers) as Record<string, number>);
  }

  const questions = await query<{ id: string }>(
    'SELECT id FROM questions WHERE chapter_id = ? ORDER BY position',
    chapterId,
  );
  if (questions.length === 0) throw HttpError.conflict('This chapter has no exam questions yet.');

  const order = shuffle(questions.map((question) => question.id));
  const attemptId = id('att');
  const expiresAt = toIso(new Date(Date.now() + config.learning.examWindowSeconds * 1000));

  await run(
    `INSERT INTO exam_attempts (id, user_id, chapter_id, expires_at, pass_mark, answers, question_order)
     VALUES (?, ?, ?, ?, ?, '{}', ?)`,
    attemptId,
    userId,
    chapterId,
    expiresAt,
    chapter.pass_mark,
    JSON.stringify(order),
  );

  return presentAttempt((await one<AttemptRow>('SELECT * FROM exam_attempts WHERE id = ?', attemptId))!);
}

/** Returns the attempt with correct answers withheld. */
async function presentAttempt(attempt: AttemptRow) {
  const order = JSON.parse(attempt.question_order) as string[];
  const rows = await query<{ id: string; prompt: string; options: string }>(
    `SELECT id, prompt, options FROM questions WHERE id IN (${order.map(() => '?').join(',')})`,
    ...order,
  );

  const byId = new Map(rows.map((row) => [row.id, row]));
  const chapter = (await one<{ title: string; pass_mark: number; reward_minutes: number }>(
    'SELECT title, pass_mark, reward_minutes FROM chapters WHERE id = ?',
    attempt.chapter_id,
  ))!;

  const expiresAt = parseSqlDate(attempt.expires_at);

  return {
    attemptId: attempt.id,
    chapterId: attempt.chapter_id,
    chapterTitle: chapter.title,
    passMark: attempt.pass_mark,
    rewardMinutes: chapter.reward_minutes,
    expiresAt: expiresAt?.toISOString() ?? null,
    secondsRemaining: expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : 0,
    savedAnswers: JSON.parse(attempt.answers) as Record<string, number>,
    questions: order
      .map((questionId) => byId.get(questionId))
      .filter((row): row is { id: string; prompt: string; options: string } => Boolean(row))
      .map((row) => ({
        id: row.id,
        prompt: row.prompt,
        options: JSON.parse(row.options) as string[],
      })),
  };
}

export async function saveAnswers(userId: string, attemptId: string, answers: Record<string, number>) {
  const attempt = await loadAttempt(userId, attemptId);
  if (attempt.submitted_at) throw HttpError.conflict('This attempt has already been submitted.');

  const merged = { ...(JSON.parse(attempt.answers) as Record<string, number>), ...answers };
  await run('UPDATE exam_attempts SET answers = ? WHERE id = ?', JSON.stringify(merged), attemptId);
  return { saved: Object.keys(merged).length };
}

export async function submitExam(userId: string, attemptId: string, answers: Record<string, number>) {
  const attempt = await loadAttempt(userId, attemptId);
  if (attempt.submitted_at) throw HttpError.conflict('This attempt has already been submitted.');

  const merged = { ...(JSON.parse(attempt.answers) as Record<string, number>), ...answers };
  return gradeAttempt(attempt, merged);
}

async function loadAttempt(userId: string, attemptId: string): Promise<AttemptRow> {
  const attempt = await one<AttemptRow>('SELECT * FROM exam_attempts WHERE id = ?', attemptId);
  if (!attempt) throw HttpError.notFound('That exam attempt does not exist.');
  if (attempt.user_id !== userId) throw HttpError.forbidden('That exam attempt belongs to another learner.');
  return attempt;
}

export interface ExamResult {
  attemptId: string;
  chapterId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passMark: number;
  passed: boolean;
  attempts: number;
  rewardSessionId: string | null;
  rewardMinutes: number;
  cooldownSeconds: number;
  review: {
    questionId: string;
    prompt: string;
    options: string[];
    selectedIndex: number | null;
    correctIndex: number;
    correct: boolean;
    explanation: string;
  }[];
}

/**
 * Grades an attempt, records progress, and — on a pass — grants the reward
 * session that unlocks movie time. Grading is server-side only; the client
 * never sees a correct answer before submission.
 */
async function gradeAttempt(attempt: AttemptRow, answers: Record<string, number>): Promise<ExamResult> {
  const order = JSON.parse(attempt.question_order) as string[];
  const questions = await query<QuestionRow>(
    `SELECT * FROM questions WHERE id IN (${order.map(() => '?').join(',')})`,
    ...order,
  );
  const byId = new Map(questions.map((question) => [question.id, question]));

  let correctCount = 0;
  const review: ExamResult['review'] = [];

  for (const questionId of order) {
    const question = byId.get(questionId);
    if (!question) continue;
    const selected = Number.isInteger(answers[questionId]) ? answers[questionId] : null;
    const correct = selected === question.correct_index;
    if (correct) correctCount += 1;
    review.push({
      questionId,
      prompt: question.prompt,
      options: JSON.parse(question.options) as string[],
      selectedIndex: selected,
      correctIndex: question.correct_index,
      correct,
      explanation: question.explanation,
    });
  }

  const total = order.length;
  const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);
  const passed = score >= attempt.pass_mark;

  const chapter = (await one<ChapterRow>('SELECT * FROM chapters WHERE id = ?', attempt.chapter_id))!;

  return transaction(async () => {
    await run(
      'UPDATE exam_attempts SET submitted_at = ?, score = ?, passed = ?, answers = ? WHERE id = ?',
      nowIso(),
      score,
      passed ? 1 : 0,
      JSON.stringify(answers),
      attempt.id,
    );

    const context = await chapterContext(attempt.user_id, attempt.chapter_id);
    const attempts = context.progress.attempts + 1;
    const bestScore = Math.max(context.progress.best_score, score);

    let rewardSessionId: string | null = null;
    let cooldownSeconds = 0;

    if (passed) {
      rewardSessionId = id('rwd');
      await run(
        `INSERT INTO reward_sessions (id, user_id, chapter_id, attempt_id, minutes_granted, status)
         VALUES (?, ?, ?, ?, ?, 'GRANTED')`,
        rewardSessionId,
        attempt.user_id,
        attempt.chapter_id,
        attempt.id,
        chapter.reward_minutes,
      );

      await setState(context.progress.id, 'REWARD_READY', {
        attempts,
        best_score: bestScore,
        passed_at: nowIso(),
        cooldown_until: null,
      });
    } else {
      // A cool-down after repeated failures pushes the learner back to the material.
      const needsCooldown = attempts % config.learning.maxAttemptsBeforeCooldown === 0;
      cooldownSeconds = needsCooldown ? config.learning.retryCooldownSeconds : 0;
      await setState(context.progress.id, 'EXAM_READY', {
        attempts,
        best_score: bestScore,
        cooldown_until: needsCooldown ? toIso(new Date(Date.now() + cooldownSeconds * 1000)) : null,
      });
    }

    return {
      attemptId: attempt.id,
      chapterId: attempt.chapter_id,
      score,
      correctCount,
      totalQuestions: total,
      passMark: attempt.pass_mark,
      passed,
      attempts,
      rewardSessionId,
      rewardMinutes: chapter.reward_minutes,
      cooldownSeconds,
      review,
    } satisfies ExamResult;
  });
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

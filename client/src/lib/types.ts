export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type ProgressState =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'STUDYING'
  | 'EXAM_READY'
  | 'REWARD_READY'
  | 'REWARD_ACTIVE'
  | 'COMPLETED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'LEARNER' | 'ADMIN';
  timezone: string;
  createdAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  level: Level;
  durationHours: number;
  accent: string;
  outcomes: string[];
  prerequisites: string[];
  chapterCount: number;
  enrolled: boolean;
  enrollmentStatus: string | null;
  completedChapters: number;
  percentComplete: number;
}

export interface ChapterSummary {
  id: string;
  position: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  passMark: number;
  rewardMinutes: number;
  questionCount: number;
  state: ProgressState | null;
  progress: { state: ProgressState; attempts: number; bestScore: number; completedAt: string | null } | null;
}

export interface CourseDetail extends Omit<CourseSummary, 'chapterCount' | 'enrolled' | 'enrollmentStatus' | 'completedChapters' | 'percentComplete'> {
  enrollment: { id: string; status: string; createdAt: string | null; completedAt: string | null } | null;
  chapters: ChapterSummary[];
}

export interface ChapterDetail {
  id: string;
  position: number;
  title: string;
  summary: string;
  content: string;
  estimatedMinutes: number;
  passMark: number;
  rewardMinutes: number;
  questionCount: number;
  state: ProgressState;
  attempts: number;
  bestScore: number;
  course: { id: string; slug: string; title: string; level: Level };
  nextChapter: { id: string; title: string } | null;
}

export interface StudyStatus {
  chapterId: string;
  state: ProgressState;
  elapsedSeconds: number;
  requiredSeconds: number;
  remainingSeconds: number;
  examUnlocked: boolean;
  attempts: number;
  bestScore: number;
  passMark: number;
  rewardMinutes: number;
}

export interface ExamQuestion {
  id: string;
  prompt: string;
  options: string[];
}

export interface ExamAttempt {
  attemptId: string;
  chapterId: string;
  chapterTitle: string;
  passMark: number;
  rewardMinutes: number;
  expiresAt: string | null;
  secondsRemaining: number;
  savedAnswers: Record<string, number>;
  questions: ExamQuestion[];
}

export interface ExamReviewItem {
  questionId: string;
  prompt: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  correct: boolean;
  explanation: string;
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
  review: ExamReviewItem[];
}

export type MovieDecision = 'WATCH_LATER' | 'DECLINED' | 'WATCHED';

export interface Movie {
  id: string;
  source: 'archive' | 'youtube' | 'tmdb' | 'catalog';
  title: string;
  year: number | null;
  synopsis: string;
  genres: string[];
  runtimeMinutes: number | null;
  posterUrl: string | null;
  sourceUrl: string | null;
  streamUrl: string | null;
  embedUrl: string | null;
  popularity: number;
  rating: number | null;
  licence: string;
  /** When the source published it (ISO 8601). */
  addedAt?: string | null;
  decision?: MovieDecision | null;
}

export interface MovieSourceStatus {
  name: string;
  status: 'ok' | 'unavailable' | 'disabled';
  count: number;
  /** Titles the most recent sync added from this source. */
  added?: number;
  detail?: string;
  syncedAt?: string | null;
}

export interface MovieSyncSummary {
  sources: { name: string; status: MovieSourceStatus['status']; fetched: number; added: number; detail?: string }[];
  added: number;
  total: number;
  durationMs: number;
}

export interface RewardSession {
  id: string;
  chapterId: string;
  chapterTitle: string;
  courseTitle: string;
  status: 'GRANTED' | 'ACTIVE' | 'EXPIRED' | 'ENDED' | 'FORFEITED';
  minutesGranted: number;
  secondsRemaining: number;
  expiresAt: string | null;
  startedAt: string | null;
  movie: { id: string; title: string; source: string; streamUrl: string | null; posterUrl: string | null } | null;
  concluded: boolean;
  nextChapterId: string | null;
  courseCompleted: boolean;
}

export interface ScheduleEntry {
  id: string;
  title: string;
  courseId: string | null;
  courseTitle: string | null;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  durationMinutes: number;
  reminderMinutes: number;
  active: boolean;
  timeZone: string;
  nextOccurrence: string | null;
}

export interface Occurrence {
  scheduleId: string;
  title: string;
  courseId: string | null;
  courseTitle: string | null;
  dayName: string;
  startTime: string;
  durationMinutes: number;
  reminderMinutes: number;
  startsAt: string;
  endsAt: string;
  remindAt: string;
  minutesUntilStart: number;
  alertDue: boolean;
  inProgress: boolean;
  acknowledged: boolean;
}

export interface Application {
  id: string;
  fullName: string;
  email: string;
  track: string;
  trackLabel: string;
  experienceLevel: Level;
  weeklyHours: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ENROLLED';
  reviewNote: string | null;
  accessCode: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface DashboardData {
  courses: CourseSummary[];
  nextChapter: {
    id: string;
    title: string;
    position: number;
    estimatedMinutes: number;
    rewardMinutes: number;
    passMark: number;
    state: ProgressState;
    courseTitle: string;
    courseSlug: string;
    level: Level;
  } | null;
  activeReward: RewardSession | null;
  upcoming: Occurrence[];
  watchLater: { movieId: string; title: string; posterUrl: string | null; year: number | null; movie: Movie | null }[];
  stats: {
    chaptersCompleted: number;
    examsTaken: number;
    examsPassed: number;
    minutesWatched: number;
    averageScore: number;
  };
  recentAttempts: {
    id: string;
    score: number;
    passed: boolean;
    submittedAt: string | null;
    chapterTitle: string;
    courseTitle: string;
  }[];
}

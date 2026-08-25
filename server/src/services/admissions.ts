import { one, nowIso, run } from '../db/index.js';
import { accessCode, id } from '../lib/ids.js';
import { HttpError } from '../lib/http-error.js';

export const TRACKS = [
  'SOFTWARE_ENGINEERING',
  'CLOUD_AND_DEVOPS',
  'CYBERSECURITY',
  'DATA_ENGINEERING',
  'IT_SUPPORT',
] as const;

export type Track = (typeof TRACKS)[number];
export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export const TRACK_LABELS: Record<Track, string> = {
  SOFTWARE_ENGINEERING: 'Software Engineering',
  CLOUD_AND_DEVOPS: 'Cloud and DevOps',
  CYBERSECURITY: 'Cybersecurity',
  DATA_ENGINEERING: 'Data Engineering',
  IT_SUPPORT: 'IT Support and Infrastructure',
};

/**
 * The course a newly admitted learner is enrolled into automatically, by track
 * and self-declared experience. Advanced applicants still begin one level below
 * their claimed ceiling when the track has no advanced entry point, because the
 * progression gate assumes prerequisites have actually been covered.
 */
const STARTER_COURSE: Record<Track, Record<Level, string>> = {
  SOFTWARE_ENGINEERING: {
    BEGINNER: 'web-development-foundations',
    INTERMEDIATE: 'backend-apis-with-node',
    ADVANCED: 'cloud-architecture-and-scalability',
  },
  CLOUD_AND_DEVOPS: {
    BEGINNER: 'linux-command-line-essentials',
    INTERMEDIATE: 'git-and-cicd-workflows',
    ADVANCED: 'cloud-architecture-and-scalability',
  },
  CYBERSECURITY: {
    BEGINNER: 'it-systems-foundations',
    INTERMEDIATE: 'backend-apis-with-node',
    ADVANCED: 'applied-cybersecurity-defence',
  },
  DATA_ENGINEERING: {
    BEGINNER: 'it-systems-foundations',
    INTERMEDIATE: 'relational-databases-and-sql',
    ADVANCED: 'cloud-architecture-and-scalability',
  },
  IT_SUPPORT: {
    BEGINNER: 'it-systems-foundations',
    INTERMEDIATE: 'linux-command-line-essentials',
    ADVANCED: 'git-and-cicd-workflows',
  },
};

export function starterCourseSlug(track: Track, level: Level): string {
  return STARTER_COURSE[track][level];
}

export interface ApplicationInput {
  fullName: string;
  email: string;
  phone?: string;
  country?: string;
  track: Track;
  experienceLevel: Level;
  weeklyHours: number;
  motivation: string;
}

export interface ApplicationRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  track: Track;
  experience_level: Level;
  weekly_hours: number;
  motivation: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ENROLLED';
  access_code: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface ReviewOutcome {
  decision: 'APPROVED' | 'PENDING';
  note: string;
}

/**
 * Admissions screening. An application that meets the published commitment
 * criteria is admitted immediately; anything else is held for a human reviewer
 * rather than rejected outright.
 */
export function screen(input: ApplicationInput): ReviewOutcome {
  const shortfalls: string[] = [];

  if (input.weeklyHours < 3) {
    shortfalls.push('a commitment of at least 3 study hours per week');
  }
  if (input.motivation.trim().length < 80) {
    shortfalls.push('a statement of at least 80 characters describing your goal');
  }

  if (shortfalls.length > 0) {
    return {
      decision: 'PENDING',
      note: `Held for review. The programme expects ${shortfalls.join(' and ')}.`,
    };
  }

  return {
    decision: 'APPROVED',
    note: `Admitted to the ${TRACK_LABELS[input.track]} track at ${input.experienceLevel.toLowerCase()} level.`,
  };
}

export async function submitApplication(input: ApplicationInput): Promise<ApplicationRecord> {
  const existing = await one<ApplicationRecord>(
    'SELECT * FROM applications WHERE email = ?',
    input.email.toLowerCase(),
  );

  if (existing) {
    if (existing.status === 'ENROLLED') {
      throw HttpError.conflict('An account already exists for this email address. Sign in instead.');
    }
    throw HttpError.conflict(
      'An application already exists for this email address. Check its status with your reference.',
      { applicationId: existing.id, status: existing.status },
    );
  }

  const outcome = screen(input);
  const applicationId = id('app');

  await run(
    `INSERT INTO applications
       (id, full_name, email, phone, country, track, experience_level, weekly_hours, motivation, status, access_code, review_note, reviewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    applicationId,
    input.fullName.trim(),
    input.email.toLowerCase(),
    input.phone?.trim() ?? null,
    input.country?.trim() ?? null,
    input.track,
    input.experienceLevel,
    input.weeklyHours,
    input.motivation.trim(),
    outcome.decision,
    outcome.decision === 'APPROVED' ? accessCode() : null,
    outcome.note,
    nowIso(),
  );

  return getApplication(applicationId);
}

export async function getApplication(applicationId: string): Promise<ApplicationRecord> {
  const record = await one<ApplicationRecord>('SELECT * FROM applications WHERE id = ?', applicationId);
  if (!record) throw HttpError.notFound('No application matches that reference.');
  return record;
}

export function findApplicationByEmail(email: string): Promise<ApplicationRecord | undefined> {
  return one<ApplicationRecord>('SELECT * FROM applications WHERE email = ?', email.toLowerCase());
}

export function findApplicationByAccessCode(code: string): Promise<ApplicationRecord | undefined> {
  return one<ApplicationRecord>(
    'SELECT * FROM applications WHERE access_code = ?',
    code.trim().toUpperCase(),
  );
}

export async function decideApplication(
  applicationId: string,
  decision: 'APPROVED' | 'REJECTED',
  note: string,
): Promise<ApplicationRecord> {
  const application = await getApplication(applicationId);
  if (application.status === 'ENROLLED') {
    throw HttpError.conflict('This application has already been converted into an account.');
  }

  await run(
    `UPDATE applications
        SET status = ?, review_note = ?, reviewed_at = ?, access_code = COALESCE(access_code, ?)
      WHERE id = ?`,
    decision,
    note,
    nowIso(),
    decision === 'APPROVED' ? accessCode() : null,
    applicationId,
  );

  return getApplication(applicationId);
}

/** Public view of an application: the access code is only revealed on approval. */
export function publicApplication(record: ApplicationRecord) {
  return {
    id: record.id,
    fullName: record.full_name,
    email: record.email,
    track: record.track,
    trackLabel: TRACK_LABELS[record.track],
    experienceLevel: record.experience_level,
    weeklyHours: record.weekly_hours,
    status: record.status,
    reviewNote: record.review_note,
    accessCode: record.status === 'APPROVED' ? record.access_code : null,
    submittedAt: record.created_at,
    reviewedAt: record.reviewed_at,
  };
}

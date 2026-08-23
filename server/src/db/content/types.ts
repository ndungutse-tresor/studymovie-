export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface SeedQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SeedChapter {
  title: string;
  summary: string;
  /** Lightweight markdown: `##` headings, `-` bullets, `1.` lists, `**bold**`, `` `code` ``. */
  content: string;
  estimatedMinutes: number;
  /** Percentage a learner must reach before the movie reward unlocks. */
  passMark: number;
  /** Minutes of viewing time granted by passing this chapter's exam. */
  rewardMinutes: number;
  questions: SeedQuestion[];
}

export interface SeedCourse {
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  level: CourseLevel;
  durationHours: number;
  accent: string;
  outcomes: string[];
  prerequisites: string[];
  chapters: SeedChapter[];
}

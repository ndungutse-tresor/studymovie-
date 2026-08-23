import type { Level, ProgressState } from './types';

export function clockFromSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return '—';

  const diffMinutes = Math.round((target - Date.now()) / 60_000);
  const absolute = Math.abs(diffMinutes);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (absolute < 60) return formatter.format(diffMinutes, 'minute');
  if (absolute < 60 * 24) return formatter.format(Math.round(diffMinutes / 60), 'hour');
  return formatter.format(Math.round(diffMinutes / (60 * 24)), 'day');
}

export function dateTimeLabel(iso: string | null, timeZone?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export const LEVEL_LABEL: Record<Level, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export const LEVEL_TONE: Record<Level, string> = {
  BEGINNER: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  INTERMEDIATE: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  ADVANCED: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

export const STATE_LABEL: Record<ProgressState, string> = {
  LOCKED: 'Locked',
  AVAILABLE: 'Ready to study',
  STUDYING: 'In progress',
  EXAM_READY: 'Exam available',
  REWARD_READY: 'Viewing time earned',
  REWARD_ACTIVE: 'Watching now',
  COMPLETED: 'Completed',
};

export const STATE_TONE: Record<ProgressState, string> = {
  LOCKED: 'border-ink-600 bg-ink-800/70 text-slate-500',
  AVAILABLE: 'border-brand-500/30 bg-brand-500/10 text-brand-200',
  STUDYING: 'border-brand-500/30 bg-brand-500/10 text-brand-200',
  EXAM_READY: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  REWARD_READY: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  REWARD_ACTIVE: 'border-violet-500/40 bg-violet-500/15 text-violet-200',
  COMPLETED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
};

/** Deterministic gradient used for titles that have no poster artwork. */
export function posterGradient(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }
  const from = hash;
  const to = (hash + 48) % 360;
  return `linear-gradient(145deg, hsl(${from} 52% 26%), hsl(${to} 46% 14%))`;
}

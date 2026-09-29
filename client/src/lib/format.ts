import type { Level, ProgressState } from './types';
import type { IconName } from '../components/Icon';

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

/** Difficulty as a count of filled bars, so level reads without a colour of its own. */
export const LEVEL_RANK: Record<Level, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
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
  LOCKED: 'border-white/10 bg-white/[0.03] text-slate-500',
  AVAILABLE: 'border-brand-400/25 bg-brand-500/10 text-brand-200',
  STUDYING: 'border-brand-400/25 bg-brand-500/10 text-brand-200',
  EXAM_READY: 'border-brand-400/40 bg-brand-500/15 text-brand-100',
  REWARD_READY: 'border-reel-400/30 bg-reel-400/10 text-reel-200',
  REWARD_ACTIVE: 'border-reel-400/40 bg-reel-400/15 text-reel-100',
  COMPLETED: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
};

/** Hex pairs for each course accent, used for covers and thumbnails. */
const ACCENTS: Record<string, [string, string]> = {
  rose: ['#f43f5e', '#881337'],
  cyan: ['#22d3ee', '#155e75'],
  indigo: ['#818cf8', '#312e81'],
  orange: ['#fb923c', '#7c2d12'],
  sky: ['#38bdf8', '#0c4a6e'],
  emerald: ['#34d399', '#064e3b'],
  violet: ['#a78bfa', '#4c1d95'],
  amber: ['#fbbf24', '#78350f'],
};

export function accentColors(accent: string | undefined): [string, string] {
  return ACCENTS[accent ?? ''] ?? ACCENTS.indigo;
}

export function categoryIcon(category: string): IconName {
  const key = category.toLowerCase();
  if (key.includes('security')) return 'shield';
  if (key.includes('cloud')) return 'cloud';
  if (key.includes('devops')) return 'branch';
  if (key.includes('data')) return 'database';
  if (key.includes('system')) return 'terminal';
  if (key.includes('infrastructure')) return 'server';
  if (key.includes('software')) return 'code';
  return 'layers';
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }
  return hash;
}

/** A muted, deterministic duotone for titles that have no poster artwork. */
export function posterTones(seed: string): { from: string; to: string; glow: string } {
  const hue = hashSeed(seed);
  return {
    from: `hsl(${hue} 26% 22%)`,
    to: `hsl(${(hue + 28) % 360} 24% 8%)`,
    glow: `hsl(${(hue + 12) % 360} 45% 55% / 0.28)`,
  };
}

export function posterGradient(seed: string): string {
  const tones = posterTones(seed);
  return `radial-gradient(120% 80% at 20% 0%, ${tones.glow}, transparent 60%), linear-gradient(160deg, ${tones.from}, ${tones.to})`;
}

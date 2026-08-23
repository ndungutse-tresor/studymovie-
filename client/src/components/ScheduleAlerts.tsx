import { Link } from 'react-router-dom';
import { useAlerts } from '../context/AlertContext';
import { Icon } from './Icon';
import { Button } from './ui';

/**
 * Floating study reminders. The server decides which occurrences are due, so a
 * reminder survives a reload and cannot be missed by a closed tab losing a timer.
 */
export function ScheduleAlerts() {
  const { due, dismiss } = useAlerts();
  if (due.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 p-4 sm:items-end sm:p-6">
      {due.slice(0, 3).map((occurrence) => (
        <div
          key={`${occurrence.scheduleId}:${occurrence.startsAt}`}
          role="alert"
          className="pointer-events-auto w-full max-w-sm animate-fade-up rounded-2xl border border-brand-500/40 bg-ink-900/95 p-4 shadow-lift backdrop-blur"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
              <Icon name="bell" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {occurrence.inProgress ? 'Study session in progress' : 'Study session starting soon'}
              </p>
              <p className="mt-0.5 truncate text-sm text-slate-400">
                {occurrence.title}
                {occurrence.courseTitle ? ` — ${occurrence.courseTitle}` : ''}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {occurrence.startTime} · {occurrence.durationMinutes} minutes ·{' '}
                {occurrence.inProgress
                  ? 'happening now'
                  : `in ${Math.max(0, occurrence.minutesUntilStart)} min`}
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  to="/app/courses"
                  onClick={() => void dismiss(occurrence)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-xs font-medium text-white transition hover:bg-brand-400"
                >
                  Start studying
                  <Icon name="arrow-right" size={13} />
                </Link>
                <Button size="sm" variant="ghost" onClick={() => void dismiss(occurrence)}>
                  Dismiss
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void dismiss(occurrence)}
              aria-label="Dismiss reminder"
              className="rounded-md p-1 text-slate-500 transition hover:bg-ink-800 hover:text-slate-300"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

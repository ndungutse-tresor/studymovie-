import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { DashboardData } from '../lib/types';
import { STATE_LABEL, STATE_TONE, durationLabel } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { Badge, Callout, EmptyState, LevelIndicator, LinkButton, ProgressBar, ProgressRing, Skeleton } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { CourseCover } from '../components/CourseCover';
import { Poster } from '../components/Poster';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const STATE_ACTION: Record<string, { label: string; path: (chapterId: string) => string }> = {
  AVAILABLE: { label: 'Start studying', path: (id) => `/app/study/${id}` },
  STUDYING: { label: 'Continue studying', path: (id) => `/app/study/${id}` },
  EXAM_READY: { label: 'Take the exam', path: (id) => `/app/exam/${id}` },
  REWARD_READY: { label: 'Choose your film', path: () => '/app/movies' },
  REWARD_ACTIVE: { label: 'Resume watching', path: () => '/app/movies' },
};

function dayParts(iso: string, timeZone?: string) {
  const date = new Date(iso);
  const options = timeZone ? { timeZone } : {};
  return {
    weekday: new Intl.DateTimeFormat(undefined, { weekday: 'short', ...options }).format(date),
    day: new Intl.DateTimeFormat(undefined, { day: 'numeric', ...options }).format(date),
    time: new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', ...options }).format(date),
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardData>('/dashboard')
      .then(setData)
      .catch(() => setError('Your dashboard could not be loaded. Refresh to try again.'));
  }, []);

  if (error) return <Callout tone="danger">{error}</Callout>;

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-52 lg:col-span-2" />
          <Skeleton className="h-52" />
        </div>
        <Skeleton className="h-24" />
      </div>
    );
  }

  const firstName = user?.fullName.split(' ')[0] ?? 'there';
  const next = data.nextChapter;
  const nextCourse = next ? data.courses.find((course) => course.slug === next.courseSlug) : undefined;
  const action = next ? (STATE_ACTION[next.state] ?? STATE_ACTION.AVAILABLE) : null;
  const passRate = data.stats.examsTaken ? Math.round((data.stats.examsPassed / data.stats.examsTaken) * 100) : 0;

  const stats: { label: string; value: string; detail: string; icon: IconName }[] = [
    { label: 'Chapters completed', value: String(data.stats.chaptersCompleted), detail: 'Across all courses', icon: 'check-circle' },
    { label: 'Exams passed', value: `${data.stats.examsPassed}/${data.stats.examsTaken}`, detail: `${passRate}% pass rate`, icon: 'target' },
    { label: 'Average score', value: `${data.stats.averageScore}%`, detail: 'Over every attempt', icon: 'chart' },
    { label: 'Time watched', value: durationLabel(data.stats.minutesWatched), detail: 'In earned sessions', icon: 'film' },
  ];

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {greeting()}, {firstName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
            Here is where you left off
          </h1>
        </div>
        <LinkButton to="/app/courses" variant="secondary" icon="library">
          Browse courses
        </LinkButton>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Continue learning */}
        {next && action ? (
          <section className="panel flex min-w-0 flex-col overflow-hidden sm:flex-row lg:col-span-2">
            <CourseCover
              accent={nextCourse?.accent ?? 'indigo'}
              category={nextCourse?.category ?? ''}
              className="h-28 shrink-0 border-b border-white/[0.06] sm:h-auto sm:w-44 sm:border-b-0 sm:border-r"
            />
            <div className="flex min-w-0 flex-1 flex-col p-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Continue learning</p>
                <Badge tone={STATE_TONE[next.state]}>{STATE_LABEL[next.state]}</Badge>
              </div>
              <p className="mt-3 truncate text-sm text-slate-400">
                {next.courseTitle} · Chapter {next.position + 1}
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">{next.title}</h2>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                <LevelIndicator level={next.level} className="text-slate-400" />
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" size={14} className="text-slate-500" />
                  {next.estimatedMinutes} min read
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="target" size={14} className="text-slate-500" />
                  {next.passMark}% to pass
                </span>
                <span className="flex items-center gap-1.5 text-reel-300">
                  <Icon name="ticket" size={14} />
                  {next.rewardMinutes} min reward
                </span>
              </div>

              <div className="mt-auto flex flex-wrap items-end justify-between gap-5 pt-6">
                {nextCourse ? (
                  <div className="w-full max-w-[16rem]">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-slate-500">Course progress</span>
                      <span className="font-medium tabular-nums text-slate-300">{nextCourse.percentComplete}%</span>
                    </div>
                    <ProgressBar value={nextCourse.percentComplete} />
                  </div>
                ) : (
                  <span />
                )}
                <LinkButton to={action.path(next.id)} iconAfter="arrow-right">
                  {action.label}
                </LinkButton>
              </div>
            </div>
          </section>
        ) : (
          <div className="lg:col-span-2">
            <EmptyState
              icon="library"
              title="No chapter queued"
              description="Enroll in a course to start the study-and-earn cycle."
              action={<LinkButton to="/app/courses">Browse courses</LinkButton>}
            />
          </div>
        )}

        {/* Viewing time */}
        {data.activeReward ? (
          <section className="relative isolate flex flex-col overflow-hidden rounded-xl border border-reel-400/25 bg-ink-900 p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 -z-10 h-48 w-48 rounded-full bg-reel-400/20 blur-3xl" />
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-reel-400/15 text-reel-200 ring-1 ring-inset ring-reel-400/30">
              <Icon name="ticket" size={19} />
            </span>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.12em] text-reel-300/80">
              {data.activeReward.status === 'ACTIVE' ? 'Session in progress' : 'Viewing time earned'}
            </p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">
              {data.activeReward.movie?.title ?? `${data.activeReward.minutesGranted} minutes are waiting`}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Earned by passing “{data.activeReward.chapterTitle}”.
            </p>
            <div className="mt-auto pt-6">
              <LinkButton
                to={data.activeReward.status === 'ACTIVE' ? `/app/watch/${data.activeReward.id}` : '/app/movies'}
                variant="reel"
                icon="play"
                block
              >
                {data.activeReward.status === 'ACTIVE' ? 'Resume session' : 'Choose a film'}
              </LinkButton>
            </div>
          </section>
        ) : (
          <section className="panel flex flex-col p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05] text-slate-400 ring-1 ring-inset ring-white/10">
              <Icon name="ticket" size={19} />
            </span>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Next reward</p>
            <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">
              {next ? `${next.rewardMinutes} minutes of viewing` : 'Nothing queued'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {next
                ? `Pass the exam for “${next.title}” to earn your next session.`
                : 'Enroll in a course to start earning viewing time.'}
            </p>
            <div className="mt-auto pt-6">
              <LinkButton to="/app/movies" variant="secondary" icon="film" block>
                Browse films
              </LinkButton>
            </div>
          </section>
        )}
      </div>

      {/* Stats */}
      <section className="panel mt-5 grid grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`p-5 ${index % 2 === 1 ? 'border-l border-white/[0.06]' : ''} ${
              index >= 2 ? 'border-t border-white/[0.06] lg:border-t-0' : ''
            } ${index === 2 ? 'lg:border-l' : ''}`}
          >
            <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Icon name={stat.icon} size={14} />
              {stat.label}
            </p>
            <p className="mt-2.5 text-2xl font-semibold tracking-tight tabular-nums text-white">{stat.value}</p>
            <p className="mt-0.5 text-xs text-slate-600">{stat.detail}</p>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-8">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">Your courses</h2>
              <Link to="/app/courses" className="text-sm font-medium text-slate-400 transition hover:text-white">
                View all
              </Link>
            </div>

            {data.courses.length === 0 ? (
              <EmptyState
                icon="library"
                title="You are not enrolled in anything yet"
                action={<LinkButton to="/app/courses">Find a course</LinkButton>}
              />
            ) : (
              <ul className="panel divide-y divide-white/[0.06]">
                {data.courses.map((course) => {
                  const done = course.percentComplete === 100;
                  return (
                    <li key={course.id}>
                      <Link
                        to={`/app/courses/${course.slug}`}
                        className="group flex items-center gap-4 p-4 transition hover:bg-white/[0.02]"
                      >
                        <CourseCover
                          accent={course.accent}
                          category={course.category}
                          compact
                          className="h-11 w-11 shrink-0 rounded-lg ring-1 ring-inset ring-white/10"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-100 group-hover:text-white">
                            {course.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {course.completedChapters} of {course.chapterCount} chapters · {course.category}
                          </p>
                        </div>
                        <ProgressRing
                          value={course.percentComplete}
                          size={40}
                          stroke={3.5}
                          tone={done ? 'text-emerald-400' : 'text-brand-400'}
                        >
                          <span className="text-[0.6rem] font-semibold tabular-nums text-slate-300">
                            {course.percentComplete}%
                          </span>
                        </ProgressRing>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {data.recentAttempts.length > 0 ? (
            <section>
              <h2 className="section-title mb-3">Recent exam results</h2>
              <ul className="panel divide-y divide-white/[0.06]">
                {data.recentAttempts.map((attempt) => (
                  <li key={attempt.id} className="flex items-center gap-4 px-4 py-3.5">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        attempt.passed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      <Icon name={attempt.passed ? 'check' : 'close'} size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">{attempt.chapterTitle}</p>
                      <p className="truncate text-xs text-slate-500">{attempt.courseTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-white">{attempt.score}%</p>
                      <p className={`text-2xs font-medium ${attempt.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {attempt.passed ? 'Passed' : 'Not passed'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-8">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">Upcoming sessions</h2>
              <Link to="/app/schedule" className="text-sm font-medium text-slate-400 transition hover:text-white">
                Manage
              </Link>
            </div>

            {data.upcoming.length === 0 ? (
              <div className="panel p-5 text-sm leading-6 text-slate-500">
                No sessions scheduled. Add study blocks to get a reminder before each one.
              </div>
            ) : (
              <ul className="panel divide-y divide-white/[0.06]">
                {data.upcoming.map((occurrence) => {
                  const parts = dayParts(occurrence.startsAt, user?.timezone);
                  return (
                    <li key={`${occurrence.scheduleId}:${occurrence.startsAt}`} className="flex items-center gap-4 p-4">
                      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-white/[0.08] bg-ink-950 leading-none">
                        <span className="text-[0.6rem] font-semibold uppercase text-brand-300">{parts.weekday}</span>
                        <span className="mt-1 text-base font-semibold text-white">{parts.day}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-200">{occurrence.title}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {parts.time} · {occurrence.durationMinutes} min
                          {occurrence.courseTitle ? ` · ${occurrence.courseTitle}` : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">Saved for later</h2>
              <Link to="/app/watchlist" className="text-sm font-medium text-slate-400 transition hover:text-white">
                View all
              </Link>
            </div>

            {data.watchLater.length === 0 ? (
              <div className="panel p-5 text-sm leading-6 text-slate-500">
                Nothing saved yet. Browse the film catalog and save titles for a future session.
              </div>
            ) : (
              <ul className="grid grid-cols-3 gap-3">
                {data.watchLater.slice(0, 3).map((item) => (
                  <li key={item.movieId}>
                    <Link to="/app/watchlist" className="group block" title={item.title}>
                      <Poster
                        title={item.title}
                        year={item.year}
                        genre={item.movie?.genres[0]}
                        posterUrl={item.posterUrl}
                        size="xs"
                        className="aspect-[2/3] rounded-md ring-1 ring-white/10 transition group-hover:ring-white/30"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

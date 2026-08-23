import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import type { DashboardData } from '../lib/types';
import { LEVEL_LABEL, LEVEL_TONE, STATE_LABEL, STATE_TONE, dateTimeLabel, durationLabel, posterGradient } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { Badge, Callout, EmptyState, LinkButton, PageHeader, Skeleton } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { CourseCard } from '../components/CourseCard';

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
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const firstName = user?.fullName.split(' ')[0] ?? 'there';
  const stats: { label: string; value: string; icon: IconName }[] = [
    { label: 'Chapters completed', value: String(data.stats.chaptersCompleted), icon: 'check-circle' },
    { label: 'Exams passed', value: `${data.stats.examsPassed} of ${data.stats.examsTaken}`, icon: 'target' },
    { label: 'Average score', value: `${data.stats.averageScore}%`, icon: 'chart' },
    { label: 'Viewing time earned', value: durationLabel(data.stats.minutesWatched), icon: 'film' },
  ];

  return (
    <>
      <PageHeader
        eyebrow={greeting()}
        title={`${firstName}, here is where you left off`}
        description="Study a chapter, clear its exam, and your viewing session unlocks the moment you pass."
        actions={<LinkButton to="/app/courses" variant="secondary" icon="library">Browse courses</LinkButton>}
      />

      {data.activeReward ? (
        <div className="panel mb-6 border-violet-500/35 bg-violet-500/[0.06] p-6">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="min-w-0">
              <Badge tone="border-violet-500/40 bg-violet-500/15 text-violet-200" icon="film">
                {data.activeReward.status === 'ACTIVE' ? 'Session in progress' : 'Viewing time earned'}
              </Badge>
              <h2 className="mt-3 text-lg font-semibold text-white">
                {data.activeReward.movie?.title ?? `${data.activeReward.minutesGranted} minutes are waiting`}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Earned by passing “{data.activeReward.chapterTitle}” in {data.activeReward.courseTitle}.
              </p>
            </div>
            <LinkButton
              to={data.activeReward.status === 'ACTIVE' ? `/app/watch/${data.activeReward.id}` : '/app/movies'}
              size="lg"
              icon="play"
            >
              {data.activeReward.status === 'ACTIVE' ? 'Resume session' : 'Choose a film'}
            </LinkButton>
          </div>
        </div>
      ) : null}

      {data.nextChapter ? (
        <section className="panel mb-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={LEVEL_TONE[data.nextChapter.level]}>{LEVEL_LABEL[data.nextChapter.level]}</Badge>
                <Badge tone={STATE_TONE[data.nextChapter.state]}>{STATE_LABEL[data.nextChapter.state]}</Badge>
              </div>
              <p className="mt-3.5 text-sm text-slate-500">{data.nextChapter.courseTitle}</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
                Chapter {data.nextChapter.position + 1}: {data.nextChapter.title}
              </h2>

              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" size={14} />
                  {data.nextChapter.estimatedMinutes} min read
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="target" size={14} />
                  {data.nextChapter.passMark}% to pass
                </span>
                <span className="flex items-center gap-1.5 text-violet-300">
                  <Icon name="film" size={14} />
                  {data.nextChapter.rewardMinutes} min reward
                </span>
              </div>
            </div>

            <LinkButton
              to={(STATE_ACTION[data.nextChapter.state] ?? STATE_ACTION.AVAILABLE).path(data.nextChapter.id)}
              size="lg"
              iconAfter="arrow-right"
            >
              {(STATE_ACTION[data.nextChapter.state] ?? STATE_ACTION.AVAILABLE).label}
            </LinkButton>
          </div>
        </section>
      ) : (
        <div className="mb-6">
          <EmptyState
            icon="library"
            title="No chapter queued"
            description="Enroll in a course to start the study-and-earn cycle."
            action={<LinkButton to="/app/courses">Browse courses</LinkButton>}
          />
        </div>
      )}

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="panel p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-800 text-slate-400">
              <Icon name={stat.icon} size={16} />
            </span>
            <p className="mt-3.5 text-2xl font-bold tracking-tight text-white">{stat.value}</p>
            <p className="mt-0.5 text-xs uppercase tracking-wider text-slate-500">{stat.label}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your courses</h2>
            <Link to="/app/courses" className="text-sm font-medium text-brand-300 hover:text-brand-200">
              All courses
            </Link>
          </div>

          {data.courses.length === 0 ? (
            <EmptyState
              icon="library"
              title="You are not enrolled in anything yet"
              action={<LinkButton to="/app/courses">Find a course</LinkButton>}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.courses.map((course) => (
                <CourseCard key={course.id} course={course} to={`/app/courses/${course.slug}`} />
              ))}
            </div>
          )}

          {data.recentAttempts.length > 0 ? (
            <div className="panel mt-6 p-5">
              <h3 className="mb-4 text-sm font-semibold text-white">Recent exam results</h3>
              <ul className="divide-y divide-ink-800">
                {data.recentAttempts.map((attempt) => (
                  <li key={attempt.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        attempt.passed
                          ? 'bg-emerald-500/12 text-emerald-300'
                          : 'bg-rose-500/12 text-rose-300'
                      }`}
                    >
                      <Icon name={attempt.passed ? 'check' : 'close'} size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">{attempt.chapterTitle}</p>
                      <p className="truncate text-xs text-slate-500">{attempt.courseTitle}</p>
                    </div>
                    <span
                      className={`text-sm font-bold ${attempt.passed ? 'text-emerald-300' : 'text-rose-300'}`}
                    >
                      {attempt.score}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <aside className="space-y-6">
          <section className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Upcoming sessions</h2>
              <Link to="/app/schedule" className="text-xs font-medium text-brand-300 hover:text-brand-200">
                Manage
              </Link>
            </div>

            {data.upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">
                No sessions scheduled. Add study blocks to get a reminder before each one.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.upcoming.map((occurrence) => (
                  <li
                    key={`${occurrence.scheduleId}:${occurrence.startsAt}`}
                    className="flex items-start gap-3 rounded-lg border border-ink-700 bg-ink-950/40 p-3"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/12 text-brand-300">
                      <Icon name="calendar" size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{occurrence.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {dateTimeLabel(occurrence.startsAt, user?.timezone)} · {occurrence.durationMinutes} min
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Saved for later</h2>
              <Link to="/app/watchlist" className="text-xs font-medium text-brand-300 hover:text-brand-200">
                View all
              </Link>
            </div>

            {data.watchLater.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nothing saved yet. Browse the film catalog and save titles for a future session.
              </p>
            ) : (
              <ul className="grid grid-cols-3 gap-3">
                {data.watchLater.slice(0, 6).map((item) => (
                  <li key={item.movieId}>
                    <div
                      className="flex aspect-[2/3] items-end overflow-hidden rounded-lg border border-ink-700 p-2"
                      style={
                        item.posterUrl
                          ? { backgroundImage: `url(${item.posterUrl})`, backgroundSize: 'cover' }
                          : { backgroundImage: posterGradient(item.title) }
                      }
                    >
                      {!item.posterUrl ? (
                        <span className="line-clamp-3 text-[0.65rem] font-semibold leading-tight text-white/85">
                          {item.title}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel border-brand-500/25 bg-brand-500/[0.05] p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
              <Icon name="shield" size={16} />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-white">How the gate works</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Study time, exam grading, and the viewing clock are all enforced on the server. Reloading,
              closing the tab, or reopening the player does not add time or skip a step.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

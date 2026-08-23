import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { CourseDetail as CourseDetailType, ChapterSummary } from '../lib/types';
import { LEVEL_LABEL, LEVEL_TONE, STATE_LABEL, STATE_TONE } from '../lib/format';
import { Badge, Button, Callout, ProgressBar, Skeleton } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';

const CHAPTER_ICON: Record<string, IconName> = {
  LOCKED: 'lock',
  AVAILABLE: 'document',
  STUDYING: 'document',
  EXAM_READY: 'target',
  REWARD_READY: 'film',
  REWARD_ACTIVE: 'play',
  COMPLETED: 'check',
};

function chapterDestination(chapter: ChapterSummary): string | null {
  switch (chapter.state) {
    case 'AVAILABLE':
    case 'STUDYING':
    case 'COMPLETED':
      return `/app/study/${chapter.id}`;
    case 'EXAM_READY':
      return `/app/exam/${chapter.id}`;
    case 'REWARD_READY':
    case 'REWARD_ACTIVE':
      return '/app/movies';
    default:
      return null;
  }
}

export default function CourseDetail() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async () => {
    try {
      const payload = await api.get<{ course: CourseDetailType }>(`/learning/courses/${slug}`);
      setCourse(payload.course);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'This course could not be loaded.');
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleEnroll() {
    setEnrolling(true);
    setError(null);
    try {
      const payload = await api.post<{ course: CourseDetailType }>(`/learning/courses/${slug}/enroll`);
      setCourse(payload.course);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Enrollment failed. Try again.');
    } finally {
      setEnrolling(false);
    }
  }

  if (error && !course) return <Callout tone="danger">{error}</Callout>;

  if (!course) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const completed = course.chapters.filter((chapter) => chapter.state === 'COMPLETED').length;
  const percent = course.chapters.length ? Math.round((completed / course.chapters.length) * 100) : 0;
  const totalReward = course.chapters.reduce((sum, chapter) => sum + chapter.rewardMinutes, 0);

  return (
    <>
      <Link
        to="/app/courses"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
      >
        <Icon name="arrow-left" size={15} />
        All courses
      </Link>

      <div className="panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={LEVEL_TONE[course.level]}>{LEVEL_LABEL[course.level]}</Badge>
          <Badge>{course.category}</Badge>
          <Badge icon="clock">{course.durationHours} hours</Badge>
          <Badge icon="film" tone="border-violet-500/30 bg-violet-500/10 text-violet-300">
            {totalReward} min of viewing time
          </Badge>
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">{course.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{course.description}</p>

        {course.enrollment ? (
          <div className="mt-6 max-w-md">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-400">
                {completed} of {course.chapters.length} chapters complete
              </span>
              <span className="font-semibold text-white">{percent}%</span>
            </div>
            <ProgressBar value={percent} tone={percent === 100 ? 'bg-emerald-500' : 'bg-brand-500'} />
          </div>
        ) : (
          <div className="mt-7">
            <Button size="lg" loading={enrolling} onClick={() => void handleEnroll()} iconAfter="arrow-right">
              Enroll in this course
            </Button>
            {error ? <p className="field-error">{error}</p> : null}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Chapters</h2>
          <ol className="space-y-3">
            {course.chapters.map((chapter) => {
              const destination = chapterDestination(chapter);
              const locked = !course.enrollment || chapter.state === 'LOCKED' || chapter.state === null;

              return (
                <li key={chapter.id}>
                  <div
                    className={`panel flex items-start gap-4 p-5 transition ${
                      locked ? 'opacity-60' : 'hover:border-brand-500/40'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${
                        chapter.state === 'COMPLETED'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : locked
                            ? 'border-ink-600 bg-ink-800 text-slate-600'
                            : 'border-brand-500/30 bg-brand-500/10 text-brand-200'
                      }`}
                    >
                      {chapter.state === 'COMPLETED' ? (
                        <Icon name="check" size={17} />
                      ) : locked ? (
                        <Icon name="lock" size={15} />
                      ) : (
                        chapter.position + 1
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-white">{chapter.title}</h3>
                        {chapter.state ? (
                          <Badge tone={STATE_TONE[chapter.state]} icon={CHAPTER_ICON[chapter.state]}>
                            {STATE_LABEL[chapter.state]}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-slate-400">{chapter.summary}</p>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Icon name="clock" size={12} />
                          {chapter.estimatedMinutes} min
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Icon name="clipboard" size={12} />
                          {chapter.questionCount} questions
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Icon name="target" size={12} />
                          {chapter.passMark}% to pass
                        </span>
                        <span className="flex items-center gap-1.5 text-violet-400">
                          <Icon name="film" size={12} />
                          {chapter.rewardMinutes} min reward
                        </span>
                        {chapter.progress && chapter.progress.attempts > 0 ? (
                          <span className="flex items-center gap-1.5">
                            <Icon name="chart" size={12} />
                            Best {chapter.progress.bestScore}%
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {destination && !locked ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(destination)}
                        iconAfter="arrow-right"
                      >
                        Open
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="space-y-5">
          <section className="panel p-5">
            <h2 className="mb-3.5 text-sm font-semibold text-white">What you will be able to do</h2>
            <ul className="space-y-2.5">
              {course.outcomes.map((outcome) => (
                <li key={outcome} className="flex gap-2.5 text-sm leading-6 text-slate-400">
                  <Icon name="check" size={14} className="mt-1 shrink-0 text-brand-400" />
                  {outcome}
                </li>
              ))}
            </ul>
          </section>

          {course.prerequisites.length > 0 ? (
            <section className="panel p-5">
              <h2 className="mb-3.5 text-sm font-semibold text-white">Assumed knowledge</h2>
              <ul className="space-y-2.5">
                {course.prerequisites.map((prerequisite) => (
                  <li key={prerequisite} className="flex gap-2.5 text-sm leading-6 text-slate-400">
                    <Icon name="arrow-right" size={14} className="mt-1 shrink-0 text-slate-600" />
                    {prerequisite}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="panel border-violet-500/25 bg-violet-500/[0.05] p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
              <Icon name="film" size={16} />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-white">Viewing time in this course</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Passing every chapter earns {totalReward} minutes across {course.chapters.length} sessions.
              Each session starts when you pick a film and closes itself when the time runs out.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

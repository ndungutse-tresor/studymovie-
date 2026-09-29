import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { CourseDetail as CourseDetailType, ChapterSummary } from '../lib/types';
import { STATE_LABEL, STATE_TONE, accentColors, categoryIcon } from '../lib/format';
import { Badge, Button, Callout, LevelIndicator, ProgressRing, Skeleton } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';
import { CourseCover } from '../components/CourseCover';

const CHAPTER_ICON: Record<string, IconName> = {
  LOCKED: 'lock',
  AVAILABLE: 'document',
  STUDYING: 'document',
  EXAM_READY: 'target',
  REWARD_READY: 'ticket',
  REWARD_ACTIVE: 'play',
  COMPLETED: 'check',
};

const CHAPTER_ACTION: Partial<Record<string, string>> = {
  AVAILABLE: 'Start',
  STUDYING: 'Continue',
  EXAM_READY: 'Take exam',
  REWARD_READY: 'Choose film',
  REWARD_ACTIVE: 'Resume',
  COMPLETED: 'Review',
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
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-56" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const completed = course.chapters.filter((chapter) => chapter.state === 'COMPLETED').length;
  const percent = course.chapters.length ? Math.round((completed / course.chapters.length) * 100) : 0;
  const totalReward = course.chapters.reduce((sum, chapter) => sum + chapter.rewardMinutes, 0);
  const totalQuestions = course.chapters.reduce((sum, chapter) => sum + chapter.questionCount, 0);
  const [accentLight] = accentColors(course.accent);

  const facts: { icon: IconName; label: string; value: string }[] = [
    { icon: 'layers', label: 'Chapters', value: String(course.chapters.length) },
    { icon: 'clock', label: 'Duration', value: `${course.durationHours} hours` },
    { icon: 'clipboard', label: 'Exam questions', value: String(totalQuestions) },
    { icon: 'ticket', label: 'Viewing time', value: `${totalReward} min` },
  ];

  return (
    <>
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/app/courses" className="transition hover:text-slate-200">
          Courses
        </Link>
        <Icon name="chevron-right" size={14} className="text-slate-700" />
        <span className="truncate text-slate-300">{course.title}</span>
      </nav>

      {/* Course hero */}
      <section className="panel relative isolate overflow-hidden">
        <CourseCover
          accent={course.accent}
          category={course.category}
          bare
          className="absolute inset-0 -z-10 opacity-90 [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"
        />
        <Icon
          name={categoryIcon(course.category)}
          size={200}
          strokeWidth={0.8}
          className="pointer-events-none absolute -right-6 -top-8 -z-10 text-white/[0.06]"
        />
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/15 backdrop-blur">
              <Icon name={categoryIcon(course.category)} size={20} />
            </span>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium" style={{ color: accentLight }}>
                {course.category}
              </span>
              <span className="text-slate-700">/</span>
              <LevelIndicator level={course.level} />
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{course.title}</h1>
            <p className="mt-4 text-[0.9375rem] leading-7 text-slate-300/90">{course.description}</p>
          </div>

          <div className="lg:w-64">
            {course.enrollment ? (
              <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-ink-950/70 p-4 backdrop-blur">
                <ProgressRing value={percent} size={56} tone={percent === 100 ? 'text-emerald-400' : 'text-brand-400'}>
                  <span className="text-xs font-semibold tabular-nums text-white">{percent}%</span>
                </ProgressRing>
                <div>
                  <p className="text-sm font-medium text-white">{percent === 100 ? 'Course complete' : 'In progress'}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {completed} of {course.chapters.length} chapters
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Button size="lg" block loading={enrolling} onClick={() => void handleEnroll()} iconAfter="arrow-right">
                  Enroll in this course
                </Button>
                {error ? <p className="field-error">{error}</p> : null}
              </div>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 border-t border-white/[0.07] bg-ink-950/40 sm:grid-cols-4">
          {facts.map((fact, index) => (
            <div
              key={fact.label}
              className={`px-6 py-4 sm:px-8 ${index % 2 === 1 ? 'border-l border-white/[0.07]' : ''} ${
                index >= 2 ? 'border-t border-white/[0.07] sm:border-t-0' : ''
              } ${index === 2 ? 'sm:border-l' : ''}`}
            >
              <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                <Icon name={fact.icon} size={13} />
                {fact.label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-white">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="section-title mb-5">Chapters</h2>
          <ol className="relative">
            {course.chapters.map((chapter, index) => {
              const destination = chapterDestination(chapter);
              const locked = !course.enrollment || chapter.state === 'LOCKED' || chapter.state === null;
              const done = chapter.state === 'COMPLETED';
              const current = !locked && !done;
              const last = index === course.chapters.length - 1;

              return (
                <li key={chapter.id} className="relative flex gap-5 pb-4">
                  {!last ? (
                    <span
                      className={`absolute left-[19px] top-11 bottom-0 w-px ${done ? 'bg-emerald-400/40' : 'bg-white/10'}`}
                      aria-hidden="true"
                    />
                  ) : null}

                  <span
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                      done
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                        : current
                          ? 'border-brand-400/60 bg-brand-500/15 text-brand-100 shadow-glow'
                          : 'border-white/10 bg-ink-900 text-slate-600'
                    }`}
                  >
                    {done ? <Icon name="check" size={16} /> : locked ? <Icon name="lock" size={14} /> : chapter.position + 1}
                  </span>

                  <div
                    className={`panel min-w-0 flex-1 p-5 ${locked ? 'opacity-55' : ''} ${
                      current ? 'border-brand-400/30' : ''
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500">Chapter {chapter.position + 1}</p>
                        <h3 className="mt-0.5 font-semibold text-white">{chapter.title}</h3>
                      </div>
                      {chapter.state && chapter.state !== 'LOCKED' ? (
                        <Badge tone={STATE_TONE[chapter.state]} icon={CHAPTER_ICON[chapter.state]}>
                          {STATE_LABEL[chapter.state]}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{chapter.summary}</p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-4">
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
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
                        <span className="flex items-center gap-1.5 text-reel-300/90">
                          <Icon name="ticket" size={12} />
                          {chapter.rewardMinutes} min reward
                        </span>
                        {chapter.progress && chapter.progress.attempts > 0 ? (
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Icon name="chart" size={12} />
                            Best {chapter.progress.bestScore}%
                          </span>
                        ) : null}
                      </div>

                      {destination && !locked && chapter.state ? (
                        <Button
                          size="sm"
                          variant={current ? 'primary' : 'secondary'}
                          onClick={() => navigate(destination)}
                          iconAfter="arrow-right"
                        >
                          {CHAPTER_ACTION[chapter.state] ?? 'Open'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-8 lg:self-start">
          <section className="panel p-5">
            <h2 className="section-title">What you will be able to do</h2>
            <ul className="mt-4 space-y-3">
              {course.outcomes.map((outcome) => (
                <li key={outcome} className="flex gap-3 text-sm leading-6 text-slate-300">
                  <Icon name="check" size={15} className="mt-1 shrink-0 text-brand-400" />
                  {outcome}
                </li>
              ))}
            </ul>
          </section>

          {course.prerequisites.length > 0 ? (
            <section className="panel p-5">
              <h2 className="section-title">Assumed knowledge</h2>
              <ul className="mt-4 space-y-3">
                {course.prerequisites.map((prerequisite) => (
                  <li key={prerequisite} className="flex gap-3 text-sm leading-6 text-slate-400">
                    <Icon name="arrow-right" size={14} className="mt-1 shrink-0 text-slate-600" />
                    {prerequisite}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="relative isolate overflow-hidden rounded-xl border border-reel-400/20 bg-ink-900 p-5">
            <div className="pointer-events-none absolute -right-12 -top-12 -z-10 h-36 w-36 rounded-full bg-reel-400/15 blur-2xl" />
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-reel-400/15 text-reel-200 ring-1 ring-inset ring-reel-400/25">
              <Icon name="ticket" size={17} />
            </span>
            <h2 className="section-title mt-4">{totalReward} minutes of viewing</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Passing every chapter earns {totalReward} minutes across {course.chapters.length} sessions. Each
              session starts when you pick a film and closes itself when the time runs out.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

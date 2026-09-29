import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { ChapterDetail, StudyStatus } from '../lib/types';
import { clockFromSeconds } from '../lib/format';
import { extractHeadings, renderMarkdown } from '../lib/markdown';
import { Button, Callout, LevelIndicator, ProgressRing, Skeleton } from '../components/ui';
import { Icon } from '../components/Icon';

/**
 * The reading view. A local ticker drives the visible countdown, but the gate
 * itself is the server's: `study/complete` is rejected until the recorded dwell
 * time has genuinely elapsed, so pausing the tab does not shorten it.
 */
export default function Study() {
  const { chapterId = '' } = useParams();
  const navigate = useNavigate();

  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [status, setStatus] = useState<StudyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [scrolled, setScrolled] = useState(0);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  const articleRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const payload = await api.get<{ chapter: ChapterDetail; study: StudyStatus }>(
        `/learning/chapters/${chapterId}`,
      );
      setChapter(payload.chapter);
      setStatus(payload.study);

      if (payload.chapter.state === 'AVAILABLE' || payload.chapter.state === 'STUDYING') {
        const started = await api.post<{ study: StudyStatus }>(
          `/learning/chapters/${chapterId}/study/start`,
        );
        setStatus(started.study);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'This chapter could not be opened.');
    }
  }, [chapterId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Visible countdown. Re-synced with the server whenever it reaches zero.
  useEffect(() => {
    if (!status || status.examUnlocked) return;
    const timer = window.setInterval(() => {
      setStatus((current) => {
        if (!current) return current;
        const remaining = Math.max(0, current.remainingSeconds - 1);
        return {
          ...current,
          remainingSeconds: remaining,
          elapsedSeconds: current.elapsedSeconds + 1,
          examUnlocked: remaining === 0,
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status?.examUnlocked, status]);

  const headings = useMemo(() => (chapter ? extractHeadings(chapter.content) : []), [chapter]);

  // Reading progress and the current section, purely for feedback.
  useEffect(() => {
    function onScroll() {
      const element = articleRef.current;
      if (!element) return;
      const total = element.scrollHeight - window.innerHeight;
      setScrolled(total <= 0 ? 100 : Math.min(100, Math.max(0, (window.scrollY / total) * 100)));

      let current: string | null = headings[0]?.id ?? null;
      for (const heading of headings) {
        const node = document.getElementById(heading.id);
        if (node && node.getBoundingClientRect().top < 140) current = heading.id;
      }
      setActiveHeading(current);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [chapter, headings]);

  const body = useMemo(() => (chapter ? renderMarkdown(chapter.content) : []), [chapter]);

  async function handleFinish() {
    setFinishing(true);
    setError(null);
    try {
      await api.post<{ study: StudyStatus }>(`/learning/chapters/${chapterId}/study/complete`);
      navigate(`/app/exam/${chapterId}`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        const details = caught.details as { remainingSeconds?: number } | undefined;
        if (typeof details?.remainingSeconds === 'number') {
          setStatus((current) =>
            current ? { ...current, remainingSeconds: details.remainingSeconds!, examUnlocked: false } : current,
          );
        }
      } else {
        setError('Could not open the exam. Try again.');
      }
    } finally {
      setFinishing(false);
    }
  }

  if (error && !chapter) return <Callout tone="danger">{error}</Callout>;

  if (!chapter || !status) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const alreadyPassed = ['REWARD_READY', 'REWARD_ACTIVE', 'COMPLETED'].includes(chapter.state);
  const gatePercent = status.requiredSeconds
    ? Math.min(100, (status.elapsedSeconds / status.requiredSeconds) * 100)
    : 100;

  return (
    <div className="pb-4">
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
        <div className="h-full bg-brand-400 transition-[width]" style={{ width: `${scrolled}%` }} />
      </div>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="mx-auto w-full max-w-3xl">
          <nav className="mb-8 flex items-center gap-1.5 text-sm text-slate-500" aria-label="Breadcrumb">
            <Link to="/app/courses" className="transition hover:text-slate-200">
              Courses
            </Link>
            <Icon name="chevron-right" size={14} className="text-slate-700" />
            <Link to={`/app/courses/${chapter.course.slug}`} className="truncate transition hover:text-slate-200">
              {chapter.course.title}
            </Link>
          </nav>

          <header className="mb-10 border-b border-white/[0.07] pb-8">
            <p className="text-sm font-medium text-brand-300">Chapter {chapter.position + 1}</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-[2.5rem]">
              {chapter.title}
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-400">{chapter.summary}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
              <LevelIndicator level={chapter.course.level} className="text-slate-400" />
              <span className="flex items-center gap-1.5">
                <Icon name="clock" size={14} />
                {chapter.estimatedMinutes} min read
              </span>
              <span className="flex items-center gap-1.5">
                <Icon name="target" size={14} />
                {chapter.passMark}% to pass
              </span>
              <span className="flex items-center gap-1.5 text-reel-300">
                <Icon name="ticket" size={14} />
                {chapter.rewardMinutes} min reward
              </span>
            </div>
          </header>

          <article ref={articleRef} className="prose-lesson">
            {body}
          </article>

          <div className="sticky bottom-4 z-30 mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-ink-850/95 p-4 shadow-lift backdrop-blur-xl sm:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                {alreadyPassed ? (
                  <>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                      <Icon name="check" size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Chapter passed</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Best score {chapter.bestScore}%. Reread this material at any time.
                      </p>
                    </div>
                  </>
                ) : status.examUnlocked ? (
                  <>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                      <Icon name="unlock" size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">The exam is open</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {chapter.questionCount} questions · {chapter.passMark}% to pass · {chapter.rewardMinutes} min of
                        viewing time if you clear it
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <ProgressRing value={gatePercent} size={40} stroke={3.5}>
                      <Icon name="lock" size={13} className="text-slate-400" />
                    </ProgressRing>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200">
                        Exam unlocks in{' '}
                        <span className="font-mono font-semibold tabular-nums text-white">
                          {clockFromSeconds(status.remainingSeconds)}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Minimum study time is {Math.ceil(status.requiredSeconds / 60)} minutes
                      </p>
                    </div>
                  </>
                )}
              </div>

              {alreadyPassed ? (
                chapter.nextChapter ? (
                  <Button onClick={() => navigate(`/app/study/${chapter.nextChapter!.id}`)} iconAfter="arrow-right">
                    Next chapter
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => navigate(`/app/courses/${chapter.course.slug}`)}>
                    Back to course
                  </Button>
                )
              ) : (
                <Button
                  loading={finishing}
                  disabled={!status.examUnlocked}
                  onClick={() => void handleFinish()}
                  iconAfter={status.examUnlocked ? 'arrow-right' : undefined}
                  icon={status.examUnlocked ? undefined : 'lock'}
                >
                  {status.examUnlocked ? 'Start the exam' : 'Exam locked'}
                </Button>
              )}
              {error ? <p className="field-error w-full">{error}</p> : null}
            </div>
          </div>
        </div>

        {headings.length > 1 ? (
          <aside className="hidden xl:block">
            <div className="sticky top-10">
              <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-slate-500">On this page</p>
              <ul className="mt-3 space-y-0.5 border-l border-white/[0.08]">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      className={`-ml-px block border-l py-1.5 pl-3.5 text-[0.8rem] leading-5 transition ${
                        activeHeading === heading.id
                          ? 'border-brand-400 text-white'
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

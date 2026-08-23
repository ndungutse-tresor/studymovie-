import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { ChapterDetail, StudyStatus } from '../lib/types';
import { LEVEL_LABEL, LEVEL_TONE, clockFromSeconds } from '../lib/format';
import { renderMarkdown } from '../lib/markdown';
import { Badge, Button, Callout, ProgressBar, Skeleton } from '../components/ui';
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

  // Reading progress, purely for feedback.
  useEffect(() => {
    function onScroll() {
      const element = articleRef.current;
      if (!element) return;
      const total = element.scrollHeight - window.innerHeight;
      setScrolled(total <= 0 ? 100 : Math.min(100, Math.max(0, (window.scrollY / total) * 100)));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [chapter]);

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
      <div className="space-y-5">
        <Skeleton className="h-6 w-48" />
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
    <div className="mx-auto max-w-3xl pb-4">
      <div className="fixed inset-x-0 top-0 z-40 h-0.5 bg-transparent">
        <div className="h-full bg-brand-500 transition-[width]" style={{ width: `${scrolled}%` }} />
      </div>

      <Link
        to={`/app/courses/${chapter.course.slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
      >
        <Icon name="arrow-left" size={15} />
        {chapter.course.title}
      </Link>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={LEVEL_TONE[chapter.course.level]}>{LEVEL_LABEL[chapter.course.level]}</Badge>
          <Badge>Chapter {chapter.position + 1}</Badge>
          <Badge icon="clock">{chapter.estimatedMinutes} min</Badge>
          <Badge icon="film" tone="border-violet-500/30 bg-violet-500/10 text-violet-300">
            {chapter.rewardMinutes} min reward
          </Badge>
        </div>
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white">{chapter.title}</h1>
        <p className="mt-3 text-base leading-7 text-slate-400">{chapter.summary}</p>
      </header>

      <article ref={articleRef} className="prose-lesson panel px-6 py-8 sm:px-9 sm:py-10">
        {body}
      </article>

      <div className="sticky bottom-4 z-30 mt-7">
        <div className="panel flex flex-wrap items-center justify-between gap-5 border-ink-600 bg-ink-900/95 p-5 shadow-lift backdrop-blur">
          <div className="min-w-0 flex-1">
            {alreadyPassed ? (
              <>
                <p className="text-sm font-semibold text-emerald-300">Chapter already passed</p>
                <p className="mt-1 text-sm text-slate-400">
                  Best score {chapter.bestScore}%. You can reread this material at any time.
                </p>
              </>
            ) : status.examUnlocked ? (
              <>
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <Icon name="check-circle" size={16} />
                  Study requirement met
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {chapter.questionCount} questions · {chapter.passMark}% to pass · {chapter.rewardMinutes}{' '}
                  minutes of viewing time if you clear it.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-slate-300">
                    Exam unlocks in{' '}
                    <span className="font-mono font-semibold text-white">
                      {clockFromSeconds(status.remainingSeconds)}
                    </span>
                  </p>
                  <span className="text-xs text-slate-500">
                    minimum {Math.ceil(status.requiredSeconds / 60)} min
                  </span>
                </div>
                <div className="mt-2.5">
                  <ProgressBar value={gatePercent} />
                </div>
              </>
            )}
            {error ? <p className="field-error">{error}</p> : null}
          </div>

          {alreadyPassed ? (
            chapter.nextChapter ? (
              <Button
                size="lg"
                onClick={() => navigate(`/app/study/${chapter.nextChapter!.id}`)}
                iconAfter="arrow-right"
              >
                Next chapter
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={() => navigate(`/app/courses/${chapter.course.slug}`)}>
                Back to course
              </Button>
            )
          ) : (
            <Button
              size="lg"
              loading={finishing}
              disabled={!status.examUnlocked}
              onClick={() => void handleFinish()}
              iconAfter="arrow-right"
            >
              {status.examUnlocked ? 'Start the exam' : 'Keep studying'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

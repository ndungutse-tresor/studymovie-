import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { ExamAttempt, ExamResult } from '../lib/types';
import { clockFromSeconds } from '../lib/format';
import { renderInline } from '../lib/markdown';
import { Button, Callout, ProgressBar, ProgressRing, Skeleton } from '../components/ui';
import { Icon } from '../components/Icon';

export default function Exam() {
  const { chapterId = '' } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retryIn, setRetryIn] = useState(0);

  const submittedRef = useRef(false);

  const startAttempt = useCallback(async () => {
    setError(null);
    setResult(null);
    submittedRef.current = false;
    try {
      const payload = await api.post<{ exam: ExamAttempt }>(`/learning/chapters/${chapterId}/exam`);
      setAttempt(payload.exam);
      setAnswers(payload.exam.savedAnswers ?? {});
      setSecondsLeft(payload.exam.secondsRemaining);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        const details = caught.details as { retryAfterSeconds?: number; remainingSeconds?: number } | undefined;
        if (typeof details?.retryAfterSeconds === 'number') setRetryIn(details.retryAfterSeconds);
      } else {
        setError('The exam could not be started.');
      }
    }
  }, [chapterId]);

  useEffect(() => {
    void startAttempt();
  }, [startAttempt]);

  const submit = useCallback(
    async (payloadAnswers: Record<string, number>) => {
      if (!attempt || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setError(null);
      try {
        const payload = await api.post<{ result: ExamResult }>(
          `/learning/exams/${attempt.attemptId}/submit`,
          { answers: payloadAnswers },
        );
        setResult(payload.result);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (caught) {
        submittedRef.current = false;
        setError(caught instanceof ApiError ? caught.message : 'Your answers could not be submitted.');
      } finally {
        setSubmitting(false);
      }
    },
    [attempt],
  );

  // The exam window is fixed by the server; when it elapses the attempt is
  // submitted with whatever has been answered so far.
  useEffect(() => {
    if (!attempt || result) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          void submit(answers);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, result, answers, submit]);

  useEffect(() => {
    if (retryIn <= 0) return;
    const timer = window.setInterval(() => setRetryIn((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [retryIn]);

  // Answers are persisted as they are chosen, so a reload does not lose them.
  useEffect(() => {
    if (!attempt || result || Object.keys(answers).length === 0) return;
    const handle = window.setTimeout(() => {
      void api.patch(`/learning/exams/${attempt.attemptId}`, { answers }).catch(() => undefined);
    }, 800);
    return () => window.clearTimeout(handle);
  }, [answers, attempt, result]);

  if (result) return <ExamResultView result={result} chapterId={chapterId} onRetry={() => void startAttempt()} />;

  if (error && !attempt) {
    return (
      <div className="mx-auto max-w-2xl">
        <Callout tone="warning" title="The exam is not open">
          {error}
          {retryIn > 0 ? (
            <span className="mt-2 block font-mono text-sm">Retry available in {clockFromSeconds(retryIn)}</span>
          ) : null}
        </Callout>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" icon="arrow-left" onClick={() => navigate(`/app/study/${chapterId}`)}>
            Back to the chapter
          </Button>
          {retryIn === 0 ? <Button onClick={() => void startAttempt()}>Try again</Button> : null}
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  const complete = answered === attempt.questions.length;
  const urgent = secondsLeft <= 60;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to={`/app/study/${chapterId}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-200"
      >
        <Icon name="arrow-left" size={15} />
        Back to the chapter
      </Link>

      <header className="sticky top-16 z-30 mb-8 rounded-xl border border-white/10 bg-ink-850/95 p-5 shadow-lift backdrop-blur-xl lg:top-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">Chapter exam</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">{attempt.chapterTitle}</h1>
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>{attempt.questions.length} questions</span>
              <span>{attempt.passMark}% to pass</span>
              <span className="text-reel-300">{attempt.rewardMinutes} min reward</span>
            </p>
          </div>

          <div
            className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2 ${
              urgent ? 'border-rose-400/40 bg-rose-500/10 text-rose-200' : 'border-white/10 bg-ink-950 text-white'
            }`}
          >
            <Icon name="clock" size={16} className={urgent ? 'text-rose-300' : 'text-slate-500'} />
            <span className="font-mono text-lg font-semibold tabular-nums">{clockFromSeconds(secondsLeft)}</span>
            <span className="sr-only">remaining</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={(answered / attempt.questions.length) * 100} className="h-1" />
          <span className="shrink-0 text-xs tabular-nums text-slate-500">
            {answered}/{attempt.questions.length} answered
          </span>
        </div>
      </header>

      {error ? (
        <div className="mb-5">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      <ol className="space-y-5">
        {attempt.questions.map((question, index) => {
          const done = answers[question.id] !== undefined;
          return (
            <li key={question.id} className="panel p-5 sm:p-7">
              <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                Question {index + 1} of {attempt.questions.length}
                {done ? <Icon name="check" size={12} className="text-brand-400" /> : null}
              </p>
              <p className="prose-lesson mt-2 text-base font-medium leading-7 text-white">
                {renderInline(question.prompt, `q${question.id}`)}
              </p>

              <div className="mt-5 space-y-2.5">
                {question.options.map((option, optionIndex) => {
                  const selected = answers[question.id] === optionIndex;
                  return (
                    <label
                      key={optionIndex}
                      className={`flex cursor-pointer items-start gap-3.5 rounded-lg border p-3.5 transition focus-within:ring-2 focus-within:ring-brand-400/60 ${
                        selected
                          ? 'border-brand-400/70 bg-brand-500/10'
                          : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]'
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={selected}
                        onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                        className="sr-only"
                      />
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-2xs font-semibold transition ${
                          selected ? 'border-brand-400 bg-brand-500 text-white' : 'border-white/15 bg-ink-950 text-slate-400'
                        }`}
                        aria-hidden="true"
                      >
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className={`prose-lesson pt-0.5 text-sm leading-6 ${selected ? 'text-white' : 'text-slate-300'}`}>
                        {renderInline(option, `o${question.id}-${optionIndex}`)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-ink-900 p-5">
        <p className="text-sm text-slate-400">
          {complete
            ? 'All questions answered. Submit when you are ready.'
            : `${attempt.questions.length - answered} question${
                attempt.questions.length - answered === 1 ? '' : 's'
              } left to answer.`}
        </p>
        <Button
          size="lg"
          loading={submitting}
          disabled={!complete}
          onClick={() => void submit(answers)}
          iconAfter="arrow-right"
        >
          Submit exam
        </Button>
      </div>
    </div>
  );
}

function ExamResultView({
  result,
  chapterId,
  onRetry,
}: {
  result: ExamResult;
  chapterId: string;
  onRetry: () => void;
}) {
  const [cooldown, setCooldown] = useState(result.cooldownSeconds);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  return (
    <div className="mx-auto max-w-3xl">
      <div
        className={`panel relative isolate overflow-hidden p-7 sm:p-9 ${
          result.passed ? 'border-emerald-400/25' : 'border-rose-400/25'
        }`}
      >
        <div
          className={`pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full blur-3xl ${
            result.passed ? 'bg-emerald-500/15' : 'bg-rose-500/10'
          }`}
        />
        <div className="flex flex-wrap items-center gap-7">
          <ProgressRing value={result.score} size={112} stroke={8} tone={result.passed ? 'text-emerald-400' : 'text-rose-400'}>
            <div className="text-center">
              <p className="text-2xl font-semibold tabular-nums text-white">{result.score}%</p>
              <p className="text-2xs text-slate-500">score</p>
            </div>
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${result.passed ? 'text-emerald-300' : 'text-rose-300'}`}>
              {result.passed ? 'Exam passed' : 'Below the pass mark'}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {result.passed ? 'You passed' : 'Not this time'}
            </h1>
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Correct</dt>
                <dd className="font-semibold text-white">
                  {result.correctCount} of {result.totalQuestions}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Pass mark</dt>
                <dd className="font-semibold text-white">{result.passMark}%</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Attempts</dt>
                <dd className="font-semibold text-white">{result.attempts}</dd>
              </div>
            </dl>
          </div>
        </div>

        <p className="mt-7 max-w-xl text-sm leading-7 text-slate-400">
          {result.passed
            ? `You have earned ${result.rewardMinutes} minutes of viewing time. Pick a film to start the session — the next chapter unlocks the moment it ends.`
            : `You need ${result.passMark}% to clear this chapter. Review the explanations below, reread anything that did not stick, and try again.`}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          {result.passed ? (
            <Link
              to="/app/movies"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-reel-400 px-5 text-[0.9375rem] font-semibold text-ink-950 shadow-glow-reel transition hover:bg-reel-300"
            >
              <Icon name="ticket" size={17} />
              Choose your film
            </Link>
          ) : (
            <>
              <Button size="lg" disabled={cooldown > 0} onClick={onRetry}>
                {cooldown > 0 ? `Retry in ${clockFromSeconds(cooldown)}` : 'Retake the exam'}
              </Button>
              <Link
                to={`/app/study/${chapterId}`}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                <Icon name="document" size={16} />
                Reread the chapter
              </Link>
            </>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="section-title mb-4">Answer review</h2>
        <ol className="space-y-4">
          {result.review.map((item, index) => (
            <li key={item.questionId} className="panel p-5 sm:p-6">
              <div className="flex gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    item.correct ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                  }`}
                >
                  <Icon name={item.correct ? 'check' : 'close'} size={14} />
                </span>
                <p className="prose-lesson pt-0.5 text-sm font-medium leading-6 text-slate-100">
                  {index + 1}. {renderInline(item.prompt, `rq${item.questionId}`)}
                </p>
              </div>

              <div className="mt-4 space-y-1.5 sm:pl-10">
                {item.options.map((option, optionIndex) => {
                  const isCorrect = optionIndex === item.correctIndex;
                  const isChosen = optionIndex === item.selectedIndex;
                  return (
                    <div
                      key={optionIndex}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm leading-6 ${
                        isCorrect
                          ? 'border-emerald-400/30 bg-emerald-500/[0.07] text-emerald-100'
                          : isChosen
                            ? 'border-rose-400/30 bg-rose-500/[0.07] text-rose-100'
                            : 'border-transparent text-slate-500'
                      }`}
                    >
                      <span className="mt-0.5 w-4 shrink-0 font-mono text-2xs font-semibold opacity-70">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span className="prose-lesson min-w-0 flex-1">
                        {renderInline(option, `ro${item.questionId}-${optionIndex}`)}
                      </span>
                      {isCorrect ? (
                        <Icon name="check" size={14} className="mt-1.5 shrink-0" />
                      ) : isChosen ? (
                        <Icon name="close" size={14} className="mt-1.5 shrink-0" />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {item.explanation ? (
                <p className="prose-lesson mt-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 text-sm leading-6 text-slate-400 sm:ml-10">
                  {renderInline(item.explanation, `re${item.questionId}`)}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

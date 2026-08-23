import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { ExamAttempt, ExamResult } from '../lib/types';
import { clockFromSeconds } from '../lib/format';
import { renderInline } from '../lib/markdown';
import { Badge, Button, Callout, ProgressBar, Skeleton } from '../components/ui';
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
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-2/3" />
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
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-200"
      >
        <Icon name="arrow-left" size={15} />
        Back to the chapter
      </Link>

      <header className="panel mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Chapter exam</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">{attempt.chapterTitle}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge icon="target">{attempt.passMark}% to pass</Badge>
              <Badge icon="clipboard">{attempt.questions.length} questions</Badge>
              <Badge icon="film" tone="border-violet-500/30 bg-violet-500/10 text-violet-300">
                {attempt.rewardMinutes} min reward
              </Badge>
            </div>
          </div>

          <div
            className={`rounded-xl border px-4 py-3 text-center ${
              urgent ? 'border-rose-500/40 bg-rose-500/10' : 'border-ink-600 bg-ink-950/50'
            }`}
          >
            <p className="text-[0.65rem] uppercase tracking-wider text-slate-500">Time remaining</p>
            <p
              className={`mt-0.5 font-mono text-xl font-bold tabular-nums ${
                urgent ? 'text-rose-300' : 'text-white'
              }`}
            >
              {clockFromSeconds(secondsLeft)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>
              {answered} of {attempt.questions.length} answered
            </span>
            <span>{Math.round((answered / attempt.questions.length) * 100)}%</span>
          </div>
          <ProgressBar value={(answered / attempt.questions.length) * 100} />
        </div>
      </header>

      {error ? (
        <div className="mb-5">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      <ol className="space-y-4">
        {attempt.questions.map((question, index) => (
          <li key={question.id} className="panel p-5 sm:p-6">
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-xs font-bold text-slate-400">
                {index + 1}
              </span>
              <p className="prose-lesson pt-0.5 text-[0.95rem] font-medium leading-6 text-slate-100">
                {renderInline(question.prompt, `q${question.id}`)}
              </p>
            </div>

            <div className="mt-4 space-y-2 sm:pl-10">
              {question.options.map((option, optionIndex) => {
                const selected = answers[question.id] === optionIndex;
                return (
                  <label
                    key={optionIndex}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                      selected
                        ? 'border-brand-500/60 bg-brand-500/10'
                        : 'border-ink-700 hover:border-ink-500 hover:bg-ink-800/40'
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
                      className={`mt-0.5 flex h-4.5 w-4.5 h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition ${
                        selected ? 'border-brand-400 bg-brand-500' : 'border-ink-500'
                      }`}
                    >
                      {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                    </span>
                    <span
                      className={`prose-lesson text-sm leading-6 ${selected ? 'text-white' : 'text-slate-300'}`}
                    >
                      {renderInline(option, `o${question.id}-${optionIndex}`)}
                    </span>
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-4 z-30 mt-6">
        <div className="panel flex flex-wrap items-center justify-between gap-4 border-ink-600 bg-ink-900/95 p-5 shadow-lift backdrop-blur">
          <p className="text-sm text-slate-400">
            {complete
              ? 'All questions answered. Submit when you are ready.'
              : `${attempt.questions.length - answered} question${
                  attempt.questions.length - answered === 1 ? '' : 's'
                } left to answer.`}
          </p>
          <Button size="lg" loading={submitting} disabled={!complete} onClick={() => void submit(answers)}>
            Submit exam
          </Button>
        </div>
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
        className={`panel p-7 sm:p-9 ${
          result.passed ? 'border-emerald-500/35 bg-emerald-500/[0.06]' : 'border-rose-500/35 bg-rose-500/[0.05]'
        }`}
      >
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
            result.passed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
          }`}
        >
          <Icon name={result.passed ? 'check-circle' : 'alert'} size={28} />
        </span>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {result.passed ? 'You passed' : 'Not this time'}
        </h1>

        <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-4xl font-extrabold tracking-tight text-white">{result.score}%</p>
            <p className="mt-0.5 text-xs uppercase tracking-wider text-slate-500">
              {result.correctCount} of {result.totalQuestions} correct
            </p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-300">{result.passMark}%</p>
            <p className="mt-0.5 text-xs uppercase tracking-wider text-slate-500">Pass mark</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-300">{result.attempts}</p>
            <p className="mt-0.5 text-xs uppercase tracking-wider text-slate-500">
              Attempt{result.attempts === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">
          {result.passed
            ? `You have earned ${result.rewardMinutes} minutes of viewing time. Pick a film to start the session — the next chapter unlocks the moment it ends.`
            : `You need ${result.passMark}% to clear this chapter. Review the explanations below, reread anything that did not stick, and try again.`}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          {result.passed ? (
            <Link
              to="/app/movies"
              className="inline-flex h-12 items-center gap-2.5 rounded-lg bg-emerald-500 px-6 text-[0.95rem] font-semibold text-ink-950 transition hover:bg-emerald-400"
            >
              <Icon name="film" size={17} />
              Choose your film
            </Link>
          ) : (
            <>
              <Button size="lg" disabled={cooldown > 0} onClick={onRetry}>
                {cooldown > 0 ? `Retry in ${clockFromSeconds(cooldown)}` : 'Retake the exam'}
              </Button>
              <Link
                to={`/app/study/${chapterId}`}
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-ink-600 px-5 text-sm font-medium text-slate-200 transition hover:border-ink-500"
              >
                <Icon name="document" size={16} />
                Reread the chapter
              </Link>
            </>
          )}
        </div>
      </div>

      <section className="mt-7">
        <h2 className="mb-4 text-lg font-semibold text-white">Answer review</h2>
        <ol className="space-y-3">
          {result.review.map((item, index) => (
            <li key={item.questionId} className="panel p-5">
              <div className="flex gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    item.correct ? 'bg-emerald-500/12 text-emerald-300' : 'bg-rose-500/12 text-rose-300'
                  }`}
                >
                  {item.correct ? <Icon name="check" size={14} /> : <Icon name="close" size={14} />}
                </span>
                <p className="prose-lesson pt-0.5 text-sm font-medium leading-6 text-slate-100">
                  {index + 1}. {renderInline(item.prompt, `rq${item.questionId}`)}
                </p>
              </div>

              <div className="mt-3.5 space-y-1.5 sm:pl-10">
                {item.options.map((option, optionIndex) => {
                  const isCorrect = optionIndex === item.correctIndex;
                  const isChosen = optionIndex === item.selectedIndex;
                  return (
                    <div
                      key={optionIndex}
                      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm leading-6 ${
                        isCorrect
                          ? 'border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-100'
                          : isChosen
                            ? 'border-rose-500/35 bg-rose-500/[0.08] text-rose-100'
                            : 'border-transparent text-slate-500'
                      }`}
                    >
                      {isCorrect ? (
                        <Icon name="check" size={14} className="mt-1.5 shrink-0" />
                      ) : isChosen ? (
                        <Icon name="close" size={14} className="mt-1.5 shrink-0" />
                      ) : (
                        <span className="mt-1.5 h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="prose-lesson">
                        {renderInline(option, `ro${item.questionId}-${optionIndex}`)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {item.explanation ? (
                <p className="prose-lesson mt-3 rounded-lg border border-ink-700 bg-ink-950/50 px-3.5 py-3 text-sm leading-6 text-slate-400 sm:ml-10">
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

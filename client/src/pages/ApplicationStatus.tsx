import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { Application } from '../lib/types';
import { LEVEL_LABEL } from '../lib/format';
import { Badge, Button, Callout, Field, TextInput } from '../components/ui';
import { Icon } from '../components/Icon';

const STATUS_TONE: Record<Application['status'], string> = {
  PENDING: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
  APPROVED: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  REJECTED: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
  ENROLLED: 'border-brand-400/30 bg-brand-500/10 text-brand-200',
};

const STATUS_LABEL: Record<Application['status'], string> = {
  PENDING: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Not accepted',
  ENROLLED: 'Account created',
};

/** How far along the admissions path an application has travelled, 0-based. */
const STATUS_STEP: Record<Application['status'], number> = {
  PENDING: 0,
  REJECTED: 1,
  APPROVED: 2,
  ENROLLED: 3,
};

const STEPS = ['Submitted', 'Reviewed', 'Approved', 'Account created'];

export default function ApplicationStatus() {
  const [params] = useSearchParams();
  const [reference, setReference] = useState(params.get('reference') ?? '');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [application, setApplication] = useState<Application | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(nextReference: string, nextEmail: string) {
    setLoading(true);
    setError(null);
    setApplication(null);

    const query = new URLSearchParams();
    if (nextReference.trim()) query.set('reference', nextReference.trim());
    if (nextEmail.trim()) query.set('email', nextEmail.trim());

    try {
      const payload = await api.get<{ application: Application }>(`/applications/status?${query}`);
      setApplication(payload.application);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'We could not look that application up right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialReference = params.get('reference') ?? '';
    const initialEmail = params.get('email') ?? '';
    if (initialReference || initialEmail) void lookup(initialReference, initialEmail);
    // Run once for the values present in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!reference.trim() && !email.trim()) {
      setError('Enter your reference or the email you applied with.');
      return;
    }
    void lookup(reference, email);
  }

  const step = application ? STATUS_STEP[application.status] : -1;
  const rejected = application?.status === 'REJECTED';
  const pending = application?.status === 'PENDING';

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-12 sm:px-6 lg:pt-16">
      <p className="text-sm font-medium text-brand-300">Admissions</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Track your application</h1>
      <p className="mt-4 text-[0.9375rem] leading-7 text-slate-400">
        Enter the reference from your submission, or the email address you applied with.
      </p>

      <form onSubmit={handleSubmit} className="panel mt-8 p-6" noValidate>
        <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
          <Field label="Application reference" htmlFor="reference" hint="Begins with app_">
            <TextInput
              id="reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="app_..."
              className="font-mono text-xs"
            />
          </Field>

          <span className="flex items-center gap-3 text-2xs font-semibold uppercase tracking-wider text-slate-600 sm:mt-9">
            <span className="h-px flex-1 bg-white/10 sm:hidden" />
            or
            <span className="h-px flex-1 bg-white/10 sm:hidden" />
          </span>

          <Field label="Email address" htmlFor="statusEmail">
            <TextInput
              id="statusEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>
        </div>

        <Button type="submit" loading={loading} block icon="search" className="mt-6">
          Check status
        </Button>
      </form>

      {error ? (
        <div className="mt-6">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      {application ? (
        <div className="panel mt-6 animate-fade-up overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6">
            <div>
              <h2 className="text-lg font-semibold text-white">{application.fullName}</h2>
              <p className="mt-0.5 text-sm text-slate-500">{application.email}</p>
            </div>
            <Badge tone={STATUS_TONE[application.status]}>{STATUS_LABEL[application.status]}</Badge>
          </div>

          {/* Progress along the admissions path */}
          <ol className="mx-6 mt-6 grid grid-cols-4 gap-2">
            {STEPS.map((label, index) => {
              const reached = index <= step && !(rejected && index > 0);
              const current = index === step;
              return (
                <li key={label}>
                  <span
                    className={`block h-1 rounded-full ${
                      rejected && index === 1
                        ? 'bg-rose-400'
                        : pending && index === 1
                          ? 'animate-progress-pulse bg-amber-400/70'
                          : reached
                            ? 'bg-brand-400'
                            : 'bg-white/10'
                    }`}
                  />
                  <span
                    className={`mt-2 block text-2xs font-medium sm:text-xs ${
                      current || (pending && index === 1) ? 'text-white' : reached ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    {rejected && index === 1 ? 'Not accepted' : pending && index === 1 ? 'Under review' : label}
                  </span>
                </li>
              );
            })}
          </ol>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/[0.06] px-6 py-5 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Track</dt>
              <dd className="mt-1 text-slate-200">{application.trackLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Level</dt>
              <dd className="mt-1 text-slate-200">{LEVEL_LABEL[application.experienceLevel]}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Weekly commitment</dt>
              <dd className="mt-1 text-slate-200">{application.weeklyHours} hours</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Submitted</dt>
              <dd className="mt-1 text-slate-200">{application.submittedAt}</dd>
            </div>
          </dl>

          {application.reviewNote ? (
            <p className="mx-6 mb-6 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm leading-6 text-slate-400">
              {application.reviewNote}
            </p>
          ) : null}

          {application.status === 'APPROVED' && application.accessCode ? (
            <div className="border-t border-white/[0.06] bg-emerald-500/[0.05] px-6 py-5">
              <p className="text-xs font-medium text-emerald-300/90">Access code</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                <code className="font-mono text-lg font-semibold tracking-[0.2em] text-white">
                  {application.accessCode}
                </code>
                <Link
                  to={`/register?code=${encodeURIComponent(application.accessCode)}`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-ink-950 transition hover:bg-emerald-400"
                >
                  Create your account
                  <Icon name="arrow-right" size={15} />
                </Link>
              </div>
            </div>
          ) : null}

          {application.status === 'ENROLLED' ? (
            <div className="border-t border-white/[0.06] px-6 py-5">
              <Callout tone="info" title="This application has an account">
                <Link to="/login" className="font-medium text-brand-200 underline underline-offset-4">
                  Sign in
                </Link>{' '}
                to continue where you left off.
              </Callout>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

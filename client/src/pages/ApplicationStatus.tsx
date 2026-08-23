import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { Application } from '../lib/types';
import { Badge, Button, Callout, Field, TextInput } from '../components/ui';
import { Icon } from '../components/Icon';

const STATUS_TONE: Record<Application['status'], string> = {
  PENDING: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  APPROVED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  REJECTED: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  ENROLLED: 'border-brand-500/30 bg-brand-500/10 text-brand-200',
};

const STATUS_LABEL: Record<Application['status'], string> = {
  PENDING: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Not accepted',
  ENROLLED: 'Account created',
};

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
      setError(
        caught instanceof ApiError ? caught.message : 'We could not look that application up right now.',
      );
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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6">
      <p className="eyebrow">Admissions</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Track your application</h1>
      <p className="mt-3 text-sm leading-7 text-slate-400">
        Enter the reference from your submission, or the email address you applied with.
      </p>

      <form onSubmit={handleSubmit} className="panel mt-7 space-y-5 p-6" noValidate>
        <Field label="Application reference" htmlFor="reference" hint="Begins with app_.">
          <TextInput
            id="reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="app_..."
            className="font-mono text-xs"
          />
        </Field>

        <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-slate-600">
          <span className="h-px flex-1 bg-ink-800" />
          or
          <span className="h-px flex-1 bg-ink-800" />
        </div>

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

        <Button type="submit" loading={loading} block icon="search">
          Check status
        </Button>
      </form>

      {error ? (
        <div className="mt-6">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      {application ? (
        <div className="panel mt-6 animate-fade-up p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">{application.email}</p>
              <h2 className="mt-0.5 text-lg font-semibold text-white">{application.fullName}</h2>
            </div>
            <Badge tone={STATUS_TONE[application.status]}>{STATUS_LABEL[application.status]}</Badge>
          </div>

          <dl className="mt-5 grid gap-4 border-t border-ink-800 pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-600">Track</dt>
              <dd className="mt-1 text-slate-300">{application.trackLabel}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-600">Level</dt>
              <dd className="mt-1 capitalize text-slate-300">
                {application.experienceLevel.toLowerCase()}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-600">Weekly commitment</dt>
              <dd className="mt-1 text-slate-300">{application.weeklyHours} hours</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-600">Submitted</dt>
              <dd className="mt-1 text-slate-300">{application.submittedAt}</dd>
            </div>
          </dl>

          {application.reviewNote ? (
            <p className="mt-5 rounded-lg border border-ink-700 bg-ink-950/50 p-4 text-sm leading-6 text-slate-400">
              {application.reviewNote}
            </p>
          ) : null}

          {application.status === 'APPROVED' && application.accessCode ? (
            <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-5">
              <p className="text-xs uppercase tracking-wider text-emerald-300/80">Access code</p>
              <code className="mt-2 block font-mono text-lg font-bold tracking-[0.2em] text-emerald-200">
                {application.accessCode}
              </code>
              <Link
                to={`/register?code=${encodeURIComponent(application.accessCode)}`}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-ink-950 transition hover:bg-emerald-400"
              >
                Create your account
                <Icon name="arrow-right" size={15} />
              </Link>
            </div>
          ) : null}

          {application.status === 'ENROLLED' ? (
            <div className="mt-5">
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

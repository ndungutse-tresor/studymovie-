import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import type { Application, Level } from '../lib/types';
import { Button, Callout, Field, Select, TextArea, TextInput } from '../components/ui';
import { Icon } from '../components/Icon';

interface TrackOption {
  value: string;
  label: string;
}
interface LevelOption {
  value: Level;
  label: string;
  description: string;
}

const MOTIVATION_MINIMUM = 80;

export default function Apply() {
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<TrackOption[]>([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Application | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    track: 'SOFTWARE_ENGINEERING',
    experienceLevel: 'BEGINNER' as Level,
    weeklyHours: 6,
    motivation: '',
  });

  useEffect(() => {
    api
      .get<{ tracks: TrackOption[]; levels: LevelOption[] }>('/applications/tracks')
      .then((payload) => {
        setTracks(payload.tracks);
        setLevels(payload.levels);
      })
      .catch(() => setFormError('Could not load the application form. Refresh to try again.'));
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const payload = await api.post<{ application: Application }>('/applications', form);
      setSubmitted(payload.application);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fields);
        setFormError(error.message);
      } else {
        setFormError('Your application could not be submitted. Try again in a moment.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (submitted) {
    const approved = submitted.status === 'APPROVED' && submitted.accessCode;

    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <div className="panel animate-fade-up p-8">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              approved ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            <Icon name={approved ? 'check-circle' : 'clock'} size={24} />
          </span>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
            {approved ? 'Your application was approved' : 'Your application is under review'}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">{submitted.reviewNote}</p>

          <dl className="mt-6 grid gap-3 rounded-xl border border-ink-700 bg-ink-950/50 p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-600">Reference</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-300">{submitted.id}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-600">Track</dt>
              <dd className="mt-1 text-slate-300">{submitted.trackLabel}</dd>
            </div>
          </dl>

          {approved ? (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-5">
              <p className="text-xs uppercase tracking-wider text-emerald-300/80">Your access code</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <code className="rounded-lg border border-emerald-500/25 bg-ink-950/60 px-4 py-2.5 font-mono text-lg font-bold tracking-[0.2em] text-emerald-200">
                  {submitted.accessCode}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={copied ? 'check' : 'clipboard'}
                  onClick={() => void copyCode(submitted.accessCode!)}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="mt-3 text-sm leading-6 text-emerald-100/70">
                Keep this safe — it is what creates your account, and it can only be used once.
              </p>
            </div>
          ) : (
            <Callout tone="warning" title="What happens next">
              An administrator will review your application. Check back with your reference or the email
              you applied with, and your access code will appear here once you are approved.
            </Callout>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            {approved ? (
              <Button
                size="lg"
                iconAfter="arrow-right"
                onClick={() => navigate(`/register?code=${encodeURIComponent(submitted.accessCode!)}`)}
              >
                Create your account
              </Button>
            ) : null}
            <Link
              to={`/application-status?reference=${encodeURIComponent(submitted.id)}`}
              className="inline-flex h-12 items-center rounded-lg border border-ink-600 px-5 text-sm font-medium text-slate-200 transition hover:border-ink-500"
            >
              Track this application
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const motivationRemaining = Math.max(0, MOTIVATION_MINIMUM - form.motivation.trim().length);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <p className="eyebrow">Admissions</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Apply for a place</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
        Applications are screened against the programme’s commitment criteria. Meet them and you are
        admitted immediately with an access code; otherwise your application is held for a reviewer.
      </p>

      {formError ? (
        <div className="mt-7">
          <Callout tone="danger" title="Check your application">
            {formError}
          </Callout>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="panel mt-7 space-y-6 p-6 sm:p-8" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="fullName" required error={fieldErrors.fullName}>
            <TextInput
              id="fullName"
              value={form.fullName}
              onChange={(event) => set('fullName', event.target.value)}
              invalid={Boolean(fieldErrors.fullName)}
              autoComplete="name"
              placeholder="Amina Uwase"
              required
            />
          </Field>

          <Field label="Email address" htmlFor="email" required error={fieldErrors.email}>
            <TextInput
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => set('email', event.target.value)}
              invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>

          <Field label="Phone" htmlFor="phone" hint="Optional." error={fieldErrors.phone}>
            <TextInput
              id="phone"
              value={form.phone}
              onChange={(event) => set('phone', event.target.value)}
              autoComplete="tel"
              placeholder="+250 ..."
            />
          </Field>

          <Field label="Country" htmlFor="country" hint="Optional." error={fieldErrors.country}>
            <TextInput
              id="country"
              value={form.country}
              onChange={(event) => set('country', event.target.value)}
              autoComplete="country-name"
              placeholder="Rwanda"
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Track" htmlFor="track" required error={fieldErrors.track}>
            <Select id="track" value={form.track} onChange={(event) => set('track', event.target.value)}>
              {tracks.map((track) => (
                <option key={track.value} value={track.value}>
                  {track.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Experience level"
            htmlFor="experienceLevel"
            required
            hint={levels.find((level) => level.value === form.experienceLevel)?.description}
            error={fieldErrors.experienceLevel}
          >
            <Select
              id="experienceLevel"
              value={form.experienceLevel}
              onChange={(event) => set('experienceLevel', event.target.value as Level)}
            >
              {levels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Study hours per week"
          htmlFor="weeklyHours"
          required
          hint="The programme expects at least 3 hours a week. Your schedule is generated from this."
          error={fieldErrors.weeklyHours}
        >
          <div className="flex items-center gap-4">
            <input
              id="weeklyHours"
              type="range"
              min={1}
              max={20}
              value={form.weeklyHours}
              onChange={(event) => set('weeklyHours', Number(event.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-700 accent-brand-500"
            />
            <span className="w-20 shrink-0 rounded-lg border border-ink-600 bg-ink-950/60 px-3 py-2 text-center text-sm font-semibold text-white">
              {form.weeklyHours} hr
            </span>
          </div>
        </Field>

        <Field
          label="Why are you applying?"
          htmlFor="motivation"
          required
          hint={
            motivationRemaining > 0
              ? `${motivationRemaining} more characters needed for automatic admission.`
              : 'Meets the admissions criteria.'
          }
          error={fieldErrors.motivation}
        >
          <TextArea
            id="motivation"
            rows={5}
            value={form.motivation}
            onChange={(event) => set('motivation', event.target.value)}
            invalid={Boolean(fieldErrors.motivation)}
            placeholder="Describe what you want to be able to do at the end of the programme, and what you are working on now."
            required
          />
        </Field>

        <div className="flex flex-wrap items-center gap-4 border-t border-ink-800 pt-6">
          <Button type="submit" size="lg" loading={submitting} iconAfter="arrow-right">
            Submit application
          </Button>
          <p className="text-xs text-slate-500">
            Already applied?{' '}
            <Link to="/application-status" className="text-brand-300 hover:text-brand-200">
              Track your application
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

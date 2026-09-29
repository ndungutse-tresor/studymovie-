import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
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
const HOURS_MINIMUM = 3;

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
        <div className="panel animate-fade-up overflow-hidden">
          <div
            className={`border-b border-white/[0.06] px-8 py-8 ${
              approved ? 'bg-gradient-to-b from-emerald-500/[0.08] to-transparent' : 'bg-gradient-to-b from-amber-500/[0.07] to-transparent'
            }`}
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full ring-1 ring-inset ${
                approved
                  ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'
                  : 'bg-amber-500/15 text-amber-300 ring-amber-400/30'
              }`}
            >
              <Icon name={approved ? 'check' : 'clock'} size={22} />
            </span>

            <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
              {approved ? 'Your application was approved' : 'Your application is under review'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">{submitted.reviewNote}</p>
          </div>

          <div className="space-y-6 px-8 py-7">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Reference</dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-200">{submitted.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Track</dt>
                <dd className="mt-1 text-slate-200">{submitted.trackLabel}</dd>
              </div>
            </dl>

            {approved ? (
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] p-5">
                <p className="text-xs font-medium text-emerald-300/90">Your access code</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  <code className="rounded-lg border border-white/10 bg-ink-950 px-4 py-2.5 font-mono text-lg font-semibold tracking-[0.2em] text-white">
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
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Keep this safe — it creates your account, and it can only be used once.
                </p>
              </div>
            ) : (
              <Callout tone="warning" title="What happens next">
                An administrator will review your application. Check back with your reference or the email you
                applied with, and your access code will appear once you are approved.
              </Callout>
            )}

            <div className="flex flex-wrap gap-3 border-t border-white/[0.06] pt-6">
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
                className="inline-flex h-11 items-center rounded-lg border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Track this application
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const motivationLength = form.motivation.trim().length;
  const criteria = [
    { met: form.weeklyHours >= HOURS_MINIMUM, label: `At least ${HOURS_MINIMUM} study hours a week` },
    { met: motivationLength >= MOTIVATION_MINIMUM, label: `A statement of at least ${MOTIVATION_MINIMUM} characters` },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-12 sm:px-6 lg:pt-16">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-brand-300">Admissions</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Apply for a place</h1>
        <p className="mt-4 text-[0.9375rem] leading-7 text-slate-400">
          Applications are screened against the programme’s commitment criteria. Meet them and you are admitted
          immediately with an access code; otherwise your application is held for a reviewer.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          {formError ? (
            <div className="mb-6">
              <Callout tone="danger" title="Check your application">
                {formError}
              </Callout>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="panel divide-y divide-white/[0.06]" noValidate>
            <FormSection title="About you" description="How we identify your application and reach you.">
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
            </FormSection>

            <FormSection title="Your programme" description="Where you start, and how much time you can give it.">
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

              <div className="mt-6">
                <Field
                  label="Study hours per week"
                  htmlFor="weeklyHours"
                  required
                  hint={`The programme expects at least ${HOURS_MINIMUM} hours a week. Your starting schedule is generated from this.`}
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
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-brand-500"
                    />
                    <span className="w-20 shrink-0 rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-center text-sm font-semibold tabular-nums text-white">
                      {form.weeklyHours} hr
                    </span>
                  </div>
                </Field>
              </div>
            </FormSection>

            <FormSection title="Your goal" description="In your own words. This is read by a person if your application is reviewed.">
              <Field label="Why are you applying?" htmlFor="motivation" required error={fieldErrors.motivation}>
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
              <div className="mt-2 flex items-center justify-between gap-4 text-xs">
                <span className={motivationLength >= MOTIVATION_MINIMUM ? 'text-emerald-300' : 'text-slate-500'}>
                  {motivationLength >= MOTIVATION_MINIMUM
                    ? 'Meets the admissions criteria.'
                    : `${MOTIVATION_MINIMUM - motivationLength} more characters needed for automatic admission.`}
                </span>
                <span className="font-mono tabular-nums text-slate-600">
                  {motivationLength}/{MOTIVATION_MINIMUM}
                </span>
              </div>
            </FormSection>

            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8">
              <p className="text-xs text-slate-500">
                Already applied?{' '}
                <Link to="/application-status" className="link">
                  Track your application
                </Link>
              </p>
              <Button type="submit" size="lg" loading={submitting} iconAfter="arrow-right">
                Submit application
              </Button>
            </div>
          </form>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-5">
            <h2 className="section-title">Automatic admission</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-400">
              Meet both criteria and you are admitted the moment you submit.
            </p>
            <ul className="mt-4 space-y-2.5">
              {criteria.map((criterion) => (
                <li key={criterion.label} className="flex items-start gap-2.5 text-sm">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
                      criterion.met ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.05] text-slate-600'
                    }`}
                  >
                    <Icon name="check" size={12} />
                  </span>
                  <span className={criterion.met ? 'text-slate-200' : 'text-slate-400'}>{criterion.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel p-5">
            <h2 className="section-title">What happens next</h2>
            <ol className="relative mt-4 space-y-5">
              <span className="absolute bottom-2 left-[9px] top-2 w-px bg-white/10" aria-hidden="true" />
              {[
                ['Screening', 'Your application is checked against the criteria on submission.'],
                ['Access code', 'Admitted applicants receive a one-time code, shown right away.'],
                ['Account', 'Redeem the code to create your account and start your first course.'],
              ].map(([title, body], index) => (
                <li key={title} className="relative flex gap-3.5">
                  <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-700 font-mono text-2xs text-slate-300 ring-4 ring-ink-900">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-100">{title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="px-6 py-7 sm:px-8">
      <div className="mb-5">
        <h2 className="section-title">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

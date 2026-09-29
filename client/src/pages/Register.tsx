import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Callout, Field, PasswordInput, TextInput } from '../components/ui';
import { Icon } from '../components/Icon';
import { AuthAside } from '../components/AuthAside';

const RULES = [
  { test: (value: string) => value.length >= 10, label: 'At least 10 characters' },
  { test: (value: string) => /[a-z]/.test(value), label: 'A lowercase letter' },
  { test: (value: string) => /[A-Z]/.test(value), label: 'An uppercase letter' },
  { test: (value: string) => /[0-9]/.test(value), label: 'A number' },
];

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();

  const [accessCode, setAccessCode] = useState(params.get('code') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);

  const satisfied = RULES.map((rule) => rule.test(password));
  const passwordValid = satisfied.every(Boolean);
  const matches = password.length > 0 && password === confirm;
  const strength = satisfied.filter(Boolean).length;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!passwordValid || !matches) {
      setError('Check the password requirements before continuing.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await register({ accessCode: accessCode.trim().toUpperCase(), password, timezone });
      navigate('/app', { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Your account could not be created.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-12 sm:px-6 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-2 lg:py-10">
      <div className="mx-auto flex w-full max-w-sm flex-col justify-center">
        <Stepper />

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-white">Create your account</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Enter the access code from your admission. You will be enrolled in your track’s entry course and given a
          starting study schedule automatically.
        </p>

        {error ? (
          <div className="mt-6">
            <Callout tone="danger">{error}</Callout>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <Field label="Access code" htmlFor="accessCode">
            <TextInput
              id="accessCode"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value.toUpperCase())}
              placeholder="SR-XXXX-XXXX"
              className="font-mono tracking-[0.15em]"
              autoComplete="one-time-code"
              required
            />
          </Field>

          <div>
            <Field label="Password" htmlFor="password">
              <PasswordInput
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </Field>

            <div className="mt-2.5 grid grid-cols-4 gap-1.5" aria-hidden="true">
              {RULES.map((rule, index) => (
                <span
                  key={rule.label}
                  className={`h-1 rounded-full transition ${
                    index < strength ? (strength === RULES.length ? 'bg-emerald-400' : 'bg-brand-400') : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {RULES.map((rule, index) => (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-xs transition ${
                    satisfied[index] ? 'text-emerald-300' : 'text-slate-500'
                  }`}
                >
                  <Icon name={satisfied[index] ? 'check-circle' : 'close'} size={13} />
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>

          <Field
            label="Confirm password"
            htmlFor="confirm"
            error={confirm.length > 0 && !matches ? 'The two passwords do not match.' : undefined}
          >
            <PasswordInput
              id="confirm"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              invalid={confirm.length > 0 && !matches}
              autoComplete="new-password"
              required
            />
          </Field>

          <p className="flex items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-xs leading-5 text-slate-400">
            <Icon name="globe" size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <span>
              Time zone detected as <span className="font-medium text-slate-200">{timezone}</span>. Reminders use it,
              and you can change it later in settings.
            </span>
          </p>

          <Button type="submit" size="lg" block loading={submitting} iconAfter="arrow-right">
            Create account
          </Button>
        </form>

        <p className="mt-8 border-t border-white/[0.07] pt-6 text-sm text-slate-400">
          Not approved yet?{' '}
          <Link to="/apply" className="link">
            Submit an application
          </Link>
        </p>
      </div>

      <AuthAside
        title="One code, one account."
        points={[
          'Your access code can be used exactly once',
          'You are enrolled in your track’s entry course',
          'A starting study schedule is created for you',
        ]}
      />
    </div>
  );
}

function Stepper() {
  return (
    <ol className="flex items-center gap-3 text-xs font-medium">
      <li className="flex items-center gap-2 text-slate-400">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <Icon name="check" size={12} />
        </span>
        Apply
      </li>
      <li className="h-px w-8 bg-white/15" aria-hidden="true" />
      <li className="flex items-center gap-2 text-white" aria-current="step">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-2xs text-white">2</span>
        Create account
      </li>
    </ol>
  );
}

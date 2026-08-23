import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Callout, Field, TextInput } from '../components/ui';
import { Icon } from '../components/Icon';

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
    <div className="mx-auto w-full max-w-md px-4 py-14 sm:px-6">
      <p className="eyebrow">Step 2 of 2</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Create your account</h1>
      <p className="mt-3 text-sm leading-7 text-slate-400">
        Enter the access code from your admission. You will be enrolled in your track’s entry course and
        given a starting study schedule automatically.
      </p>

      {error ? (
        <div className="mt-6">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="panel mt-6 space-y-5 p-6" noValidate>
        <Field label="Access code" htmlFor="accessCode" required>
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

        <Field label="Password" htmlFor="password" required>
          <TextInput
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {RULES.map((rule, index) => (
            <li
              key={rule.label}
              className={`flex items-center gap-1.5 text-xs ${
                satisfied[index] ? 'text-emerald-300' : 'text-slate-500'
              }`}
            >
              <Icon name={satisfied[index] ? 'check-circle' : 'close'} size={13} />
              {rule.label}
            </li>
          ))}
        </ul>

        <Field
          label="Confirm password"
          htmlFor="confirm"
          required
          error={confirm.length > 0 && !matches ? 'The two passwords do not match.' : undefined}
        >
          <TextInput
            id="confirm"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            invalid={confirm.length > 0 && !matches}
            autoComplete="new-password"
            required
          />
        </Field>

        <p className="hint">
          Your time zone is set to <span className="text-slate-300">{timezone}</span>. Schedule reminders
          use it, and you can change it later in settings.
        </p>

        <Button type="submit" size="lg" block loading={submitting} iconAfter="arrow-right">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Not approved yet?{' '}
        <Link to="/apply" className="text-brand-300 hover:text-brand-200">
          Submit an application
        </Link>
      </p>
    </div>
  );
}

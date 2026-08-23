import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Callout, Field, TextInput } from '../components/ui';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const destination = (location.state as { from?: string } | null)?.from ?? '/app';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Sign in failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-white">Sign in</h1>
      <p className="mt-3 text-sm leading-7 text-slate-400">
        Continue your course, or start the chapter your schedule has queued up.
      </p>

      {error ? (
        <div className="mt-6">
          <Callout tone="danger">{error}</Callout>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="panel mt-6 space-y-5 p-6" noValidate>
        <Field label="Email address" htmlFor="email" required>
          <TextInput
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </Field>

        <Field label="Password" htmlFor="password" required>
          <TextInput
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        <Button type="submit" size="lg" block loading={submitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        No account yet?{' '}
        <Link to="/apply" className="text-brand-300 hover:text-brand-200">
          Apply for a place
        </Link>
      </p>
    </div>
  );
}

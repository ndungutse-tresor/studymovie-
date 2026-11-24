import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button, Callout, Field, PasswordInput, TextInput } from '../components/ui';
import { AuthAside, AuthFooterNote } from '../components/AuthAside';
import { useResendConfirmation } from '../components/ConfirmEmail';

const VERIFIED_NOTICES: Record<string, { tone: 'success' | 'warning'; text: string }> = {
  '1': { tone: 'success', text: 'Your email is confirmed. Sign in to start studying.' },
  expired: {
    tone: 'warning',
    text: 'That confirmation link has expired or was already used. Sign in and we will offer a new one.',
  },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [params] = useSearchParams();
  const notice = VERIFIED_NOTICES[params.get('verified') ?? ''];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirmation = useResendConfirmation();

  const destination = (location.state as { from?: string } | null)?.from;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setErrorCode(null);
    try {
      const user = await login(email.trim(), password);
      navigate(destination ?? (user.role === 'ADMIN' ? '/admin' : '/app'), { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Sign in failed. Try again.');
      setErrorCode(caught instanceof ApiError ? caught.code : null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-12 sm:px-6 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-2 lg:py-10">
      <div className="mx-auto flex w-full max-w-sm flex-col justify-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Welcome back</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Sign in to continue your course, or start the chapter your schedule has queued up.
        </p>

        {notice && !error ? (
          <div className="mt-6">
            <Callout tone={notice.tone}>{notice.text}</Callout>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6">
            <Callout tone={errorCode === 'EMAIL_UNVERIFIED' ? 'warning' : 'danger'}>
              {error}
              {errorCode === 'EMAIL_UNVERIFIED' ? (
                <>
                  <br />
                  <button
                    type="button"
                    className="confirm-inline"
                    disabled={confirmation.sending || confirmation.wait > 0}
                    onClick={() => confirmation.resend(email.trim())}
                  >
                    {confirmation.wait > 0 ? `Send again in ${confirmation.wait}s` : 'Send me a new link'}
                  </button>
                </>
              ) : null}
            </Callout>
            {confirmation.message ? (
              <p className={`confirm-message ${confirmation.failed ? 'is-error' : ''}`} role="status">
                {confirmation.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <Field label="Email address" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@gmail.com"
              required
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <PasswordInput
              id="password"
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

        <div className="mt-8 border-t border-white/[0.07] pt-6 text-sm text-slate-400">
          <p>
            No account yet?{' '}
            <Link to="/apply" className="link">
              Apply for a place
            </Link>
          </p>
          <p className="mt-2">
            Admitted already?{' '}
            <Link to="/register" className="link">
              Redeem your access code
            </Link>
          </p>
        </div>

        <AuthFooterNote>Sessions use short-lived tokens that rotate on every refresh.</AuthFooterNote>
      </div>

      <AuthAside />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../lib/api';
import { Button } from './ui';
import { Icon } from './Icon';

/** Asks for another confirmation link, counting down when the server says to wait. */
export function useResendConfirmation() {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  async function resend(email: string) {
    setSending(true);
    setMessage(null);
    setFailed(false);
    try {
      const result = await api.post<{ message: string }>('/auth/verification', { email });
      setMessage(result.message);
      setWait(60);
    } catch (caught) {
      setFailed(true);
      if (caught instanceof ApiError) {
        const seconds = (caught.details as { wait?: number } | undefined)?.wait;
        // A wait shows on the button as a countdown, so it needs no message.
        if (seconds) setWait(seconds);
        else setMessage(caught.message);
      } else {
        setMessage('The link could not be sent. Try again in a moment.');
      }
    } finally {
      setSending(false);
    }
  }

  return { resend, sending, message, failed, wait };
}

/** Shown once an account is made: the learner confirms from their Gmail inbox. */
export function CheckYourGmail({ email, sent }: { email: string; sent: boolean }) {
  const { resend, sending, message, failed, wait } = useResendConfirmation();

  return (
    <div className="confirm-panel">
      <span className="confirm-panel-icon" aria-hidden="true">
        <Icon name="mail" size={22} />
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">Check your Gmail</h1>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        {sent ? 'We sent a confirmation link to ' : 'Your account is ready, but the confirmation email to '}
        <span className="font-medium text-slate-100">{email}</span>
        {sent
          ? '. Open it to finish creating your account, then sign in. The link expires in 24 hours.'
          : ' could not be sent just now. Ask for a new link below.'}
      </p>

      <ol className="confirm-steps">
        <li>
          <span>1</span>
          <p>Open the email from StudyReel. Look in Spam if it is not in your inbox.</p>
        </li>
        <li>
          <span>2</span>
          <p>
            Press <strong>Confirm email</strong>.
          </p>
        </li>
        <li>
          <span>3</span>
          <p>Sign in with your Gmail address and password.</p>
        </li>
      </ol>

      {message ? (
        <p className={`confirm-message ${failed ? 'is-error' : ''}`} role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="secondary" loading={sending} disabled={wait > 0} onClick={() => resend(email)}>
          {wait > 0 ? `Send again in ${wait}s` : 'Send the link again'}
        </Button>
        <Link to="/login" className="link text-sm">
          I’ve confirmed it, sign in
        </Link>
      </div>
    </div>
  );
}

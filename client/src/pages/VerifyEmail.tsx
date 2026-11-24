import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Spinner } from '../components/ui';

// A link can be used once, so each token is posted once even when React mounts
// this page twice in development.
const attempts = new Map<string, Promise<'confirmed' | 'expired'>>();

function confirm(token: string) {
  let attempt = attempts.get(token);
  if (!attempt) {
    attempt = api
      .post<{ status: 'confirmed' | 'expired' }>('/auth/verify', { token })
      .then((result) => result.status)
      .catch(() => 'expired' as const);
    attempts.set(token, attempt);
  }
  return attempt;
}

/** Where the emailed link lands: confirms the address, then goes to sign in. */
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  useEffect(() => {
    let active = true;
    const outcome = token ? confirm(token) : Promise.resolve('expired' as const);
    void outcome.then((status) => {
      if (active) navigate(`/login?verified=${status === 'confirmed' ? '1' : 'expired'}`, { replace: true });
    });
    return () => {
      active = false;
    };
  }, [token, navigate]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <Spinner size={22} />
      <p className="text-sm text-slate-400">Confirming your email…</p>
    </div>
  );
}

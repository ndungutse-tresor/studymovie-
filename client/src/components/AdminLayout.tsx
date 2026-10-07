import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brand } from './Brand';
import { Icon } from './Icon';
import { Button } from './ui';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-ink-950/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <Brand to="/admin" />
            <span className="hidden h-6 w-px bg-white/10 sm:block" />
            <span className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-reel-300 sm:inline-flex">
              <Icon name="shield" size={15} />
              Administration
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-xs text-slate-400 md:block">{user?.email}</span>
            <Button variant="secondary" size="sm" icon="logout" onClick={() => void handleSignOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}
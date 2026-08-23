import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertContext';
import { Brand } from './Brand';
import { Icon, type IconName } from './Icon';
import { ScheduleAlerts } from './ScheduleAlerts';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/app/courses', label: 'Courses', icon: 'library' },
  { to: '/app/movies', label: 'Movies', icon: 'film' },
  { to: '/app/watchlist', label: 'Watch later', icon: 'bookmark' },
  { to: '/app/schedule', label: 'Schedule', icon: 'calendar' },
  { to: '/app/settings', label: 'Settings', icon: 'settings' },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { next } = useAlerts();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const initials = (user?.fullName ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  async function handleSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink-800 bg-ink-950/80 px-4 py-5 lg:flex">
        <div className="px-2">
          <Brand to="/app" />
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavItemLink key={item.to} item={item} />
          ))}
        </nav>

        {next ? (
          <div className="mb-4 rounded-xl border border-ink-700 bg-ink-900/70 p-3">
            <p className="eyebrow mb-1.5">Next session</p>
            <p className="truncate text-sm font-medium text-slate-200">{next.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {next.dayName} at {next.startTime}
            </p>
          </div>
        ) : null}

        <div className="rounded-xl border border-ink-700 bg-ink-900/70 p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-200">
              {initials || 'SR'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">{user?.fullName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-ink-600 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-ink-500 hover:text-white"
          >
            <Icon name="logout" size={14} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-800 bg-ink-950/90 px-4 py-3 backdrop-blur lg:hidden">
          <Brand to="/app" />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="rounded-lg border border-ink-600 p-2 text-slate-300"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={18} />
          </button>
        </header>

        {menuOpen ? (
          <nav className="border-b border-ink-800 bg-ink-950/95 px-3 py-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((item) => (
                <NavItemLink key={item.to} item={item} />
              ))}
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-ink-800"
              >
                <Icon name="logout" size={17} />
                Sign out
              </button>
            </div>
          </nav>
        ) : null}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>

      <ScheduleAlerts />
    </div>
  );
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? 'bg-brand-500/15 text-brand-100 ring-1 ring-inset ring-brand-500/30'
            : 'text-slate-400 hover:bg-ink-800/70 hover:text-slate-100'
        }`
      }
    >
      <Icon name={item.icon} size={17} />
      {item.label}
    </NavLink>
  );
}

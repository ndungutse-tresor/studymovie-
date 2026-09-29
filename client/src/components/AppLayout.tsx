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

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Learn',
    items: [
      { to: '/app', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/app/courses', label: 'Courses', icon: 'library' },
      { to: '/app/schedule', label: 'Schedule', icon: 'calendar' },
    ],
  },
  {
    title: 'Watch',
    items: [
      { to: '/app/movies', label: 'Movies', icon: 'film' },
      { to: '/app/watchlist', label: 'Watch later', icon: 'bookmark' },
    ],
  },
  {
    title: 'Account',
    items: [{ to: '/app/settings', label: 'Settings', icon: 'settings' }],
  },
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

  const navigation = (
    <nav className="flex flex-col gap-6" aria-label="Application">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-[0.14em] text-slate-600">
            {group.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavItemLink key={item.to} item={item} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-ink-950 lg:flex">
        <div className="flex h-16 items-center px-5">
          <Brand to="/app" />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">{navigation}</div>

        <div className="space-y-3 p-3">
          {next ? (
            <NavLink
              to="/app/schedule"
              className="block rounded-lg border border-white/[0.07] bg-ink-900 p-3 transition hover:border-white/[0.14]"
            >
              <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <Icon name="calendar" size={12} />
                Next session
              </p>
              <p className="mt-1.5 truncate text-sm font-medium text-slate-100">{next.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {next.dayName} at {next.startTime}
              </p>
            </NavLink>
          ) : null}

          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-semibold text-white">
              {initials || 'SR'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-100">{user?.fullName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-md p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
            >
              <Icon name="logout" size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile bar */}
        <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-ink-950/90 backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Brand to="/app" />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:bg-white/[0.06]"
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={18} />
            </button>
          </div>

          {menuOpen ? (
            <div className="border-t border-white/[0.07] px-3 pb-4 pt-4">
              {navigation}
              <div className="mt-4 flex items-center gap-3 border-t border-white/[0.07] px-3 pt-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-2xs font-semibold text-white">
                  {initials || 'SR'}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">{user?.fullName}</p>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06]"
                >
                  <Icon name="logout" size={14} />
                  Sign out
                </button>
              </div>
            </div>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
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
        `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-white/[0.07] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand-400" /> : null}
          <Icon
            name={item.icon}
            size={17}
            className={isActive ? 'text-brand-300' : 'text-slate-500 transition group-hover:text-slate-300'}
          />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

import { Link, NavLink, Outlet } from 'react-router-dom';
import { Brand } from './Brand';

const LINKS = [
  { to: '/', label: 'How it works', end: true },
  { to: '/catalog', label: 'Catalog' },
  { to: '/apply', label: 'Apply' },
  { to: '/application-status', label: 'Track application' },
];

export function PublicLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/apply"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-400"
            >
              Apply
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-ink-800/80 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>StudyReel — study-gated viewing for IT professionals.</p>
          <p className="text-xs">
            Films are sourced from public-domain and freely redistributable collections.
          </p>
        </div>
      </footer>
    </div>
  );
}

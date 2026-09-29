import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Brand } from './Brand';
import { Icon } from './Icon';
import { LinkButton } from './ui';

const LINKS = [
  { to: '/', label: 'How it works', end: true },
  { to: '/catalog', label: 'Curriculum' },
  { to: '/apply', label: 'Admissions' },
  { to: '/application-status', label: 'Track application' },
];

const FOOTER_COLUMNS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Programme',
    links: [
      { to: '/', label: 'How it works' },
      { to: '/catalog', label: 'Curriculum' },
    ],
  },
  {
    title: 'Admissions',
    links: [
      { to: '/apply', label: 'Apply for a place' },
      { to: '/application-status', label: 'Track an application' },
      { to: '/register', label: 'Redeem an access code' },
    ],
  },
  {
    title: 'Learners',
    links: [
      { to: '/login', label: 'Sign in' },
      { to: '/app', label: 'Dashboard' },
    ],
  },
];

export function PublicLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <header
        className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
          scrolled || menuOpen ? 'border-white/[0.07] bg-ink-950/85 backdrop-blur-xl' : 'border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Brand />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition ${
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
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white sm:block"
            >
              Sign in
            </Link>
            <LinkButton to="/apply" size="sm" className="h-9 px-4 text-sm">
              Apply now
            </LinkButton>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="ml-1 rounded-lg border border-white/10 p-2 text-slate-300 transition hover:bg-white/[0.06] md:hidden"
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={18} />
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="border-t border-white/[0.07] px-4 pb-4 pt-2 md:hidden" aria-label="Main">
            {[...LINKS, { to: '/login', label: 'Sign in', end: false }].map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-lg px-3 py-3 text-[0.95rem] font-medium transition ${
                    isActive ? 'bg-white/[0.06] text-white' : 'text-slate-300 hover:bg-white/[0.04]'
                  }`
                }
              >
                {link.label}
                <Icon name="chevron-right" size={16} className="text-slate-600" />
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-white/[0.07] bg-ink-950">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Brand />
            <p className="mt-4 text-sm leading-6 text-slate-500">
              A study-gated streaming platform. Professional IT coursework, where every film is earned by
              passing the chapter before it.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold text-slate-200">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-slate-500 transition hover:text-slate-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.05]">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>&copy; {new Date().getFullYear()} StudyReel. All rights reserved.</p>
            <p>Films are sourced from public-domain and freely redistributable collections.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

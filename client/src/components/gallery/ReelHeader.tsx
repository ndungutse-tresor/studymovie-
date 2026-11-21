import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { RewardSession } from '../../lib/types';

const NAV = [
  { to: '/app', label: 'Dashboard', end: true },
  { to: '/app/courses', label: 'Courses' },
  { to: '/app/movies', label: 'Movies' },
  { to: '/app/watchlist', label: 'Watch later' },
  { to: '/app/schedule', label: 'Schedule' },
];

interface ReelHeaderProps {
  /** Undefined while loading, null when the learner has no viewing time. */
  reward?: RewardSession | null;
  search?: string;
  onSearch?: (value: string) => void;
}

/** The light header used by the movie gallery and the film page. */
export function ReelHeader({ reward, search, onSearch }: ReelHeaderProps) {
  const { user } = useAuth();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!onSearch) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSearch]);

  const initials = (user?.fullName ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <header className="gs-header">
      <div className="gs-header-left">
        <Link to="/app" className="gs-mark" aria-label="StudyReel dashboard">
          <svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true">
            <rect x="0.75" y="0.75" width="18.5" height="14.5" rx="2.5" fill="none" stroke="#111" strokeWidth="1.5" />
            <path d="M5 1v14M15 1v14" stroke="#111" strokeWidth="1" opacity="0.45" />
            <path d="M8.5 5.2v5.6L13 8 8.5 5.2Z" fill="#111" />
          </svg>
          StudyReel
        </Link>
        <nav className="gs-nav" aria-label="Application">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="gs-header-right">
        {onSearch ? (
          <label className="gs-search">
            <span className="gs-sr">Search films</span>
            <input
              ref={searchRef}
              type="search"
              placeholder="Search…"
              value={search ?? ''}
              onChange={(event) => onSearch(event.target.value)}
            />
            <kbd>⌘K</kbd>
          </label>
        ) : null}
        {reward !== undefined ? <RewardChip reward={reward} /> : null}
        <Link className="gs-icon-link" to="/app/settings" aria-label="Account settings">
          <span className="gs-initials">{initials || '·'}</span>
        </Link>
      </div>
    </header>
  );
}

function RewardChip({ reward }: { reward: RewardSession | null }) {
  if (reward?.status === 'ACTIVE') {
    return (
      <Link className="gs-pill is-live" to={`/app/watch/${reward.id}`}>
        Now playing
      </Link>
    );
  }
  if (reward?.status === 'GRANTED') {
    return (
      <span className="gs-pill is-earned" title={`Earned by clearing “${reward.chapterTitle}”`}>
        {reward.minutesGranted} min to spend
      </span>
    );
  }
  return (
    <Link className="gs-pill" to="/app" title="Pass a chapter exam to earn viewing time">
      No viewing time
    </Link>
  );
}

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminShell, { type ShellNavGroup, type ShellSearch } from './admin/AdminShell';
import { AdminStatsProvider, useAdminStats } from './admin/AdminStats';
import './admin/glass-admin.css';
import './admin/reel-admin.css';

function ReelAdminShell() {
  const { user, logout } = useAuth();
  const { stats } = useAdminStats();
  const navigate = useNavigate();
  const location = useLocation();
  const pending = stats?.applications.byStatus.PENDING ?? 0;
  const enrolled = stats?.applications.byStatus.ENROLLED ?? 0;
  const admitted = enrolled + (stats?.applications.byStatus.APPROVED ?? 0);

  const groups: ShellNavGroup[] = [
    { label: 'Dashboard', items: [{ href: '/admin', label: 'Overview', icon: 'home' }] },
    { label: 'Admissions', items: [{ href: '/admin/applications', label: 'Applications', icon: 'inbox', count: pending }] },
    {
      label: 'Content',
      items: [
        { href: '/admin/movies', label: 'Films', icon: 'film' },
        { href: '/admin/learning', label: 'Learning', icon: 'graduation' },
      ],
    },
    { label: 'System', items: [{ href: '/app', label: 'Learner app', icon: 'play' }] },
  ];

  const searches: ShellSearch[] = [
    { label: 'Find applications matching', icon: 'inbox', href: (q) => `/admin/applications?q=${encodeURIComponent(q)}` },
  ];

  return (
    <AdminShell
      brand={{ mark: 'S', title: 'StudyReel Admin', subtitle: 'Control center', href: '/admin' }}
      groups={groups}
      user={{ name: user?.fullName ?? 'Administrator', role: 'Administrator', href: '/admin' }}
      meter={stats ? { label: 'Admitted learners', value: enrolled, total: Math.max(admitted, 1), caption: `${enrolled} of ${admitted} enrolled` } : undefined}
      alerts={{
        count: pending,
        href: '/admin/applications',
        label: pending ? `${pending} ${pending === 1 ? 'application is' : 'applications are'} waiting` : 'No applications waiting',
      }}
      site={{ href: '/', label: 'Open the StudyReel site' }}
      searches={searches}
      searchPlaceholder="Search pages and applicants…"
      onSignOut={async () => {
        await logout();
        navigate('/login', { replace: true });
      }}
    >
      {/* Keyed by path so every admin page floats in on the glass sheet. */}
      <div className="ga-page" key={location.pathname}>
        <Outlet />
      </div>
    </AdminShell>
  );
}

export function AdminLayout() {
  return (
    <AdminStatsProvider>
      <ReelAdminShell />
    </AdminStatsProvider>
  );
}

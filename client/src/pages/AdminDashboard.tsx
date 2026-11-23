import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import type { MovieSyncSummary } from '../lib/types';
import { useAdminStats } from '../components/admin/AdminStats';
import {
  BarChart,
  Change,
  Donut,
  GaIcon,
  Greeting,
  Segmented,
  StatCard,
  Today,
  initials,
  rise,
} from '../components/admin/GlassKit';

type Range = '4' | '8' | '12';

const STATUS: Record<string, [string, string]> = {
  PENDING: ['is-amber', 'In review'],
  APPROVED: ['is-green', 'Approved'],
  REJECTED: ['is-red', 'Declined'],
  ENROLLED: ['is-blue', 'Enrolled'],
};

const ACTIONS: Record<string, string> = {
  'account.created': 'Created a learner account',
};

function when(value: string) {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { stats, error, refresh } = useAdminStats();
  const [range, setRange] = useState<Range>('8');
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const weeks = useMemo(
    () =>
      (stats?.applications.weekly ?? []).map((row) => ({
        label: new Date(`${row.week}T00:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        value: row.count,
        hint: `Week of ${new Date(`${row.week}T00:00:00`).toLocaleDateString('en', { month: 'long', day: 'numeric' })}`,
      })),
    [stats],
  );

  async function syncMovies() {
    setSyncing(true);
    setNotice(null);
    setSyncError(null);
    try {
      const result = await api.post<{ sync: MovieSyncSummary }>('/movies/sync');
      setNotice(`Film sources refreshed: ${result.sync.added} new titles, ${result.sync.total} in all.`);
      await refresh();
    } catch (caught) {
      setSyncError(caught instanceof ApiError ? caught.message : 'Could not refresh the film sources.');
    } finally {
      setSyncing(false);
    }
  }

  const firstName = user?.fullName.trim().split(/\s+/)[0] ?? 'there';

  if (!stats) {
    return error ? (
      <div className="ga-empty" role="alert">
        <strong>{error}</strong>
        <button className="ga-button" type="button" onClick={() => void refresh()}><GaIcon name="refresh" /> Try again</button>
      </div>
    ) : (
      <div className="ga-loading" role="status" aria-label="Loading"><i /><i /><i /></div>
    );
  }

  const { applications, learners, learning, rewards, films } = stats;
  const pending = applications.byStatus.PENDING;
  const passRate = learning.examsTaken ? (learning.examsPassed / learning.examsTaken) * 100 : 0;
  const shown = weeks.slice(-Number(range));
  const shownTotal = shown.reduce((sum, week) => sum + week.value, 0);
  const trackTotal = applications.tracks.reduce((sum, track) => sum + track.count, 0);

  return (
    <div>
      <header className="ga-head">
        <div {...rise(0)}>
          <h1><Greeting name={firstName} /></h1>
          <p><Today /> · {pending ? `${pending} ${pending === 1 ? 'application is' : 'applications are'} waiting for you` : 'No applications waiting'}</p>
        </div>
        <div {...rise(1, 'ga-head-actions')}>
          <button className="ga-button" type="button" onClick={() => void syncMovies()} disabled={syncing}>
            <GaIcon name="refresh" /> {syncing ? 'Syncing…' : 'Sync film sources'}
          </button>
          <Link className="ga-button is-dark" to="/admin/applications"><GaIcon name="inbox" /> Review applications</Link>
        </div>
      </header>

      {notice ? <p className="ga-notice is-success" role="status"><GaIcon name="check" />{notice}</p> : null}
      {syncError ? <p className="ga-notice is-error" role="alert"><GaIcon name="alert" />{syncError}</p> : null}

      <div className="ga-grid is-hero">
        <section {...rise(2, 'ga-card')}>
          <div className="ga-card-head">
            <div>
              <h2>Applications</h2>
              <p>{shownTotal} {shownTotal === 1 ? 'person' : 'people'} applied in the last {range} weeks</p>
            </div>
            <div className="ga-card-tools">
              <Segmented<Range> label="Applications period" value={range} onChange={setRange} options={[{ value: '4', label: '4 weeks' }, { value: '8', label: '8 weeks' }, { value: '12', label: '12 weeks' }]} />
              <Link className="ga-button is-dark is-small" to="/admin/applications"><GaIcon name="inbox" /> Open applications</Link>
            </div>
          </div>
          <BarChart data={shown} format={(value) => String(Math.round(value))} empty="Applications will chart here week by week." />
        </section>

        <section {...rise(3, 'ga-card')}>
          <div className="ga-card-head">
            <div><h2>Applicants by track</h2><p>Everyone who has applied</p></div>
          </div>
          {trackTotal ? (
            <Donut
              data={applications.tracks.map((track) => ({ label: track.label, value: track.count }))}
              center={String(trackTotal)}
              centerLabel="applicants"
              format={(value) => String(value)}
            />
          ) : <div className="ga-empty"><GaIcon name="users" size={22} /><span>No applications yet.</span></div>}
        </section>
      </div>

      <div className="ga-grid is-four">
        <StatCard index={4} icon="inbox" value={pending} label="Waiting for review" sub={`${applications.byStatus.APPROVED} approved, not yet enrolled`} />
        <StatCard index={5} icon="users" value={learners.total} label="Learners" sub={`${learners.thisMonth} joined this month`} badge={<Change now={learners.thisMonth} before={learners.lastMonth} />} />
        <StatCard index={6} icon="graduation" value={learning.courses} label="Courses" sub={`${learning.chapters} chapters · ${learning.enrollments} enrolments`} />
        <StatCard index={7} icon="percent" value={passRate} format={(value) => `${value.toFixed(1)}%`} label="Exam pass rate" sub={`${learning.examsPassed} of ${learning.examsTaken} passed, last 30 days`} />
        <StatCard index={8} icon="clock" value={rewards.minutesGranted} label="Minutes earned" sub="Reward time granted, last 30 days" />
        <StatCard index={9} icon="play" value={rewards.minutesWatched} label="Minutes watched" sub={`${rewards.sessions} reward sessions`} />
        <StatCard index={10} icon="film" value={films.total} label="Films in the catalogue" sub={`${films.bySource.length} ${films.bySource.length === 1 ? 'source' : 'sources'}`} />
        <StatCard index={11} icon="activity" value={rewards.activeSessions} label="Watching now" sub="Reward sessions running" />
      </div>

      <div className="ga-grid is-hero">
        <section {...rise(12, 'ga-card')}>
          <div className="ga-card-head">
            <div><h2>Latest applications</h2><p>The newest people asking to join</p></div>
            <Link className="ga-button is-small" to="/admin/applications">All applications <GaIcon name="up" /></Link>
          </div>
          {applications.recent.length ? (
            <div className="ga-table-wrap">
              <table className="ga-table">
                <thead><tr><th>Applicant</th><th>Track</th><th>Hours</th><th>Status</th><th>When</th></tr></thead>
                <tbody>
                  {applications.recent.map((application) => {
                    const [tone, label] = STATUS[application.status] ?? ['', application.status];
                    return (
                      <tr key={application.id}>
                        <td><div className="ga-person"><span className="ga-avatar">{initials(application.fullName)}</span><div><strong>{application.fullName}</strong><small>{application.email}</small></div></div></td>
                        <td>{application.trackLabel}</td>
                        <td>{application.weeklyHours} h/week</td>
                        <td><span className={`ga-chip ${tone}`}><span className="ga-pip" />{label}</span></td>
                        <td>{when(application.submittedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="ga-empty"><GaIcon name="inbox" size={22} /><span>Applications will appear here.</span></div>}
        </section>

        <section {...rise(13, 'ga-card')}>
          <div className="ga-card-head">
            <div><h2>Film sources</h2><p>Where the catalogue comes from</p></div>
            <Link className="ga-button is-small" to="/admin/movies">Films</Link>
          </div>
          <div className="ga-feed">
            {films.sources.length ? films.sources.map((source) => (
              <div className="ga-feed-item" key={source.name}>
                <span className="ga-stat-icon"><GaIcon name={source.status === 'ok' ? 'check' : source.status === 'disabled' ? 'x' : 'alert'} /></span>
                <div>
                  <p><strong>{source.name}</strong> · {source.item_count} titles</p>
                  <small>{source.status === 'ok' ? 'Working' : source.status === 'disabled' ? 'Turned off' : 'Not reachable'} · synced {when(source.synced_at)}</small>
                </div>
              </div>
            )) : films.bySource.map((row) => (
              <div className="ga-feed-item" key={row.source}>
                <span className="ga-stat-icon"><GaIcon name="film" /></span>
                <div><p><strong>{row.source}</strong></p><small>{row.count} titles</small></div>
              </div>
            ))}
            {stats.activity.slice(0, 3).map((event) => (
              <div className="ga-feed-item" key={event.id}>
                <span className="ga-stat-icon"><GaIcon name="userPlus" /></span>
                <div><p>{ACTIONS[event.action] ?? event.action}{event.by ? ` · ${event.by}` : ''}</p><small>{when(event.at)}</small></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

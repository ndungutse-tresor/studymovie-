import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { Application } from '../lib/types';
import { useAdminStats } from '../components/admin/AdminStats';
import { GaIcon, Segmented, StatCard, initials, rise } from '../components/admin/GlassKit';

type ApplicationFilter = 'ALL' | Application['status'];
type AdminApplication = Application & {
  phone: string | null;
  country: string | null;
  motivation: string;
};

const STATUS: Record<Application['status'], [string, string]> = {
  PENDING: ['is-amber', 'In review'],
  APPROVED: ['is-green', 'Approved'],
  REJECTED: ['is-red', 'Declined'],
  ENROLLED: ['is-blue', 'Enrolled'],
};

// One soft colour pair per track, for the card artwork.
const TRACK_ART: Record<string, [string, string]> = {
  SOFTWARE_ENGINEERING: ['#1d7fd0', '#3cc6ea'],
  CLOUD_AND_DEVOPS: ['#0f766e', '#5eead4'],
  CYBERSECURITY: ['#3730a3', '#818cf8'],
  DATA_ENGINEERING: ['#9a3412', '#fdba74'],
  IT_SUPPORT: ['#155e75', '#67e8f9'],
};

function ago(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : days < 30 ? `${days} days ago` : new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AdminApplications() {
  const { refresh: refreshStats } = useAdminStats();
  const [params, setParams] = useSearchParams();
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [filter, setFilter] = useState<ApplicationFilter>('PENDING');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadApplications() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<{ applications: AdminApplication[] }>('/applications');
      setApplications(result.applications);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load applications. Check the API connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
  }, []);

  // A search typed in the top bar arrives as ?q= and looks across every status.
  useEffect(() => {
    const q = params.get('q');
    if (q !== null) {
      setSearch(q);
      setFilter('ALL');
    }
  }, [params]);

  const counts = applications.reduce<Record<Application['status'], number>>(
    (total, application) => {
      total[application.status] += 1;
      return total;
    },
    { PENDING: 0, APPROVED: 0, REJECTED: 0, ENROLLED: 0 },
  );

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    return applications.filter(
      (application) =>
        (filter === 'ALL' || application.status === filter) &&
        (!text || [application.fullName, application.email, application.trackLabel, application.country ?? ''].some((value) => value.toLowerCase().includes(text))),
    );
  }, [applications, filter, search]);

  async function decide(application: AdminApplication, decision: 'APPROVED' | 'REJECTED') {
    setBusyId(application.id);
    setError(null);
    setNotice(null);
    try {
      const result = await api.post<{ application: AdminApplication }>(`/applications/${application.id}/decision`, {
        decision,
        note: notes[application.id] ?? '',
      });
      setApplications((current) => current.map((item) => (item.id === application.id ? result.application : item)));
      setNotice(
        decision === 'APPROVED' && result.application.accessCode
          ? `Approved ${application.fullName}. Access code: ${result.application.accessCode}`
          : `${application.fullName} was ${decision === 'APPROVED' ? 'approved' : 'declined'}.`,
      );
      void refreshStats();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save this decision. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  const pick = (value: ApplicationFilter) => setFilter(value);

  return (
    <div>
      <header className="ga-head">
        <div {...rise(0)}>
          <h1>Applications</h1>
          <p>Every applicant is checked here before they get an access code</p>
        </div>
        <div {...rise(1, 'ga-head-actions')}>
          <button className="ga-button" type="button" onClick={() => void loadApplications()} disabled={loading}>
            <GaIcon name="refresh" /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="ga-button is-dark" type="button" onClick={() => pick('PENDING')}><GaIcon name="check" /> Show what’s waiting</button>
        </div>
      </header>

      <div className="ga-grid is-four" aria-label="Application totals">
        <StatCard index={2} icon="clock" value={counts.PENDING} label="Waiting for review" sub="Oldest first is fairest" onClick={() => pick('PENDING')} pressed={filter === 'PENDING'} />
        <StatCard index={3} icon="check" value={counts.APPROVED} label="Approved" sub="Access code sent" onClick={() => pick('APPROVED')} pressed={filter === 'APPROVED'} />
        <StatCard index={4} icon="graduation" value={counts.ENROLLED} label="Enrolled" sub="Studying now" onClick={() => pick('ENROLLED')} pressed={filter === 'ENROLLED'} />
        <StatCard index={5} icon="x" value={counts.REJECTED} label="Declined" sub="Not admitted this time" onClick={() => pick('REJECTED')} pressed={filter === 'REJECTED'} />
      </div>

      <div {...rise(6, 'ga-toolbar')} style={{ ...rise(6).style, marginTop: 16 }}>
        <label className="ga-search-field">
          <GaIcon name="search" />
          <input
            className="ga-input"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              if (params.get('q') !== null) setParams({}, { replace: true });
            }}
            placeholder="Name, email, track or country"
            aria-label="Search applications"
          />
        </label>
        <Segmented<ApplicationFilter>
          label="Filter applications"
          value={filter}
          onChange={pick}
          options={[
            { value: 'PENDING', label: 'In review', count: counts.PENDING },
            { value: 'APPROVED', label: 'Approved', count: counts.APPROVED },
            { value: 'ENROLLED', label: 'Enrolled', count: counts.ENROLLED },
            { value: 'REJECTED', label: 'Declined', count: counts.REJECTED },
            { value: 'ALL', label: 'All', count: applications.length },
          ]}
        />
      </div>

      {error ? <p className="ga-notice is-error" role="alert"><GaIcon name="alert" />{error}</p> : null}
      {notice ? <p className="ga-notice is-success" role="status"><GaIcon name="check" />{notice}</p> : null}

      {loading && applications.length === 0 ? (
        <div className="ga-loading" role="status" aria-label="Loading applications"><i /><i /></div>
      ) : visible.length === 0 ? (
        <div {...rise(7, 'ga-card ga-empty')}>
          <GaIcon name="sparkles" size={22} />
          <strong>{filter === 'PENDING' && !search ? 'You’re all caught up.' : 'No applications match.'}</strong>
          <span>{filter === 'PENDING' && !search ? 'New applications will appear here.' : 'Try another filter or search.'}</span>
        </div>
      ) : (
        <div className="ga-grid is-tiles" aria-busy={loading}>
          {visible.map((application, index) => {
            const [tone, label] = STATUS[application.status];
            const [from, to] = TRACK_ART[application.track] ?? ['#1d7fd0', '#3cc6ea'];
            const busy = busyId === application.id;
            return (
              <article key={application.id} {...rise(7 + Math.min(index, 8), 'ga-card ga-tile is-lift')}>
                <div className="ga-tile-media">
                  <div className="ga-tile-art ga-applicant" style={{ background: `radial-gradient(90% 90% at 30% 20%, ${to}, ${from})` }}>
                    <span className="ga-applicant-initials">{initials(application.fullName)}</span>
                    <span className="ga-applicant-track">{application.trackLabel}</span>
                  </div>
                  <span className="ga-chip is-glass"><span className={`ga-pip ga-pip-${tone}`} />{label}</span>
                  <span className="ga-chip is-glass"><GaIcon name="clock" />{application.weeklyHours} h/week</span>
                </div>
                <div className="ga-tile-body">
                  <h3>{application.fullName}</h3>
                  <p>{application.email}</p>
                  <div className="ga-tile-tags">
                    <span className="ga-chip">{application.experienceLevel.toLowerCase()}</span>
                    {application.country ? <span className="ga-chip"><GaIcon name="globe" />{application.country}</span> : null}
                    <span className="ga-chip">Applied {ago(application.submittedAt)}</span>
                    {application.gmail === false ? (
                      <span className={`ga-chip ${application.adminApproved ? 'is-green' : 'is-amber'}`}>
                        {application.adminApproved ? 'Not Gmail · approved by you' : 'Not Gmail'}
                      </span>
                    ) : null}
                  </div>
                  <p className={open[application.id] ? 'ga-motivation' : 'ga-motivation ga-clamp'}>{application.motivation}</p>
                  {application.motivation.length > 140 ? (
                    <button type="button" className="ga-link" onClick={() => setOpen((current) => ({ ...current, [application.id]: !current[application.id] }))}>
                      {open[application.id] ? 'Show less' : 'Read their motivation'}
                    </button>
                  ) : null}
                  {application.reviewNote ? <p><em>Note: {application.reviewNote}</em></p> : null}
                  {application.status === 'APPROVED' && application.accessCode ? (
                    <p className="ga-code">Access code <strong>{application.accessCode}</strong></p>
                  ) : null}
                  {application.status === 'PENDING' ? (
                    <label className="ga-field" style={{ marginTop: 8 }}>
                      <span>Note for the applicant <small>(optional)</small></span>
                      <textarea
                        className="ga-textarea"
                        rows={2}
                        maxLength={500}
                        value={notes[application.id] ?? ''}
                        onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                      />
                    </label>
                  ) : null}
                </div>
                {application.status === 'PENDING' ? (
                  <footer className="ga-tile-actions">
                    <button className="ga-button is-danger" type="button" disabled={busyId !== null} onClick={() => void decide(application, 'REJECTED')}>
                      <GaIcon name="x" /> Decline
                    </button>
                    <button className="ga-button is-dark" type="button" disabled={busyId !== null} onClick={() => void decide(application, 'APPROVED')}>
                      <GaIcon name="check" /> {busy ? 'Saving…' : 'Approve'}
                    </button>
                  </footer>
                ) : application.status === 'APPROVED' && application.gmail === false && !application.adminApproved ? (
                  <footer className="ga-tile-actions is-stacked">
                    <p className="ga-note">Not Gmail: they cannot create the account until you approve the address.</p>
                    <button className="ga-button is-dark" type="button" disabled={busyId !== null} onClick={() => void decide(application, 'APPROVED')}>
                      <GaIcon name="check" /> {busy ? 'Saving…' : 'Approve address'}
                    </button>
                  </footer>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

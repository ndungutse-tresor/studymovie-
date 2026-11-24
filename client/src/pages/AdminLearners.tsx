import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { Application, Level } from '../lib/types';
import { useAdminStats } from '../components/admin/AdminStats';
import { GaIcon, Segmented, StatCard, initials, rise } from '../components/admin/GlassKit';

interface Learner {
  id: string;
  fullName: string;
  email: string;
  role: 'LEARNER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string | null;
  gmail: boolean;
  emailVerifiedAt: string | null;
  emailApprovedAt: string | null;
}

interface Summary {
  total: number;
  needsApproval: number;
  unconfirmed: number;
}

type Filter = 'ALL' | 'BLOCKED' | 'UNCONFIRMED' | 'ALLOWED';

interface Option {
  value: string;
  label: string;
}

/** Whether the account may sign in, and why: the same rule the server applies. */
function standing(learner: Learner): { tone: string; label: string; filter: Exclude<Filter, 'ALL'> } {
  if (learner.role === 'ADMIN') return { tone: 'is-blue', label: 'Administrator', filter: 'ALLOWED' };
  if (learner.emailApprovedAt) return { tone: 'is-green', label: 'Approved by an admin', filter: 'ALLOWED' };
  if (!learner.gmail) return { tone: 'is-red', label: 'Not Gmail · blocked', filter: 'BLOCKED' };
  if (!learner.emailVerifiedAt) return { tone: 'is-amber', label: 'Waiting to confirm', filter: 'UNCONFIRMED' };
  return { tone: 'is-green', label: 'Gmail, confirmed', filter: 'ALLOWED' };
}

function joined(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

const EMPTY_FORM = {
  fullName: '',
  email: '',
  track: 'SOFTWARE_ENGINEERING',
  experienceLevel: 'BEGINNER' as Level,
  weeklyHours: 6,
};

export default function AdminLearners() {
  const { refresh: refreshStats } = useAdminStats();
  const [params, setParams] = useSearchParams();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, needsApproval: 0, unconfirmed: 0 });
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [added, setAdded] = useState<Application | null>(null);
  const [copied, setCopied] = useState(false);
  const [tracks, setTracks] = useState<Option[]>([]);
  const [levels, setLevels] = useState<Option[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<{ learners: Learner[]; summary: Summary }>('/admin/learners');
      setLearners(result.learners);
      setSummary(result.summary);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load accounts. Check the API connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    api
      .get<{ tracks: Option[]; levels: Option[] }>('/applications/tracks')
      .then((payload) => {
        setTracks(payload.tracks);
        setLevels(payload.levels);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const q = params.get('q');
    if (q !== null) {
      setSearch(q);
      setFilter('ALL');
    }
  }, [params]);

  const counts = useMemo(() => {
    const total = { BLOCKED: 0, UNCONFIRMED: 0, ALLOWED: 0 };
    for (const learner of learners) total[standing(learner).filter] += 1;
    return total;
  }, [learners]);

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    return learners.filter(
      (learner) =>
        (filter === 'ALL' || standing(learner).filter === filter) &&
        (!text || learner.fullName.toLowerCase().includes(text) || learner.email.toLowerCase().includes(text)),
    );
  }, [learners, filter, search]);

  async function change(learner: Learner, body: { emailAccess?: 'approve' | 'withdraw'; emailVerified?: true }, done: string) {
    setBusyId(learner.id);
    setError(null);
    setNotice(null);
    try {
      const result = await api.patch<{ learner: Learner }>(`/admin/learners/${learner.id}`, body);
      setLearners((current) => current.map((item) => (item.id === learner.id ? result.learner : item)));
      setNotice(done);
      void load();
      void refreshStats();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save that change. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function addLearner(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setAdded(null);
    setCopied(false);
    try {
      const result = await api.post<{ application: Application }>('/admin/learners', form);
      setAdded(result.application);
      setForm(EMPTY_FORM);
      void refreshStats();
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Could not add this person. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const registerLink = added?.accessCode ? `${window.location.origin}/register?code=${encodeURIComponent(added.accessCode)}` : '';

  return (
    <div>
      <header className="ga-head">
        <div {...rise(0)}>
          <h1>Learners</h1>
          <p>Who has an account, and whose email may sign in</p>
        </div>
        <div {...rise(1, 'ga-head-actions')}>
          <button className="ga-button" type="button" onClick={() => void load()} disabled={loading}>
            <GaIcon name="refresh" /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="ga-button is-dark" type="button" aria-expanded={adding} onClick={() => setAdding((value) => !value)}>
            <GaIcon name={adding ? 'x' : 'plus'} /> {adding ? 'Close' : 'Add a learner'}
          </button>
        </div>
      </header>

      <div className="ga-grid is-four" aria-label="Account totals">
        <StatCard index={2} icon="users" value={summary.total} label="Learner accounts" sub="Everyone who signed up" onClick={() => setFilter('ALL')} pressed={filter === 'ALL'} />
        <StatCard index={3} icon="alert" value={counts.BLOCKED} label="Need your approval" sub="Not Gmail, so blocked" onClick={() => setFilter('BLOCKED')} pressed={filter === 'BLOCKED'} />
        <StatCard index={4} icon="clock" value={counts.UNCONFIRMED} label="Waiting to confirm" sub="Link sent to their Gmail" onClick={() => setFilter('UNCONFIRMED')} pressed={filter === 'UNCONFIRMED'} />
        <StatCard index={5} icon="check" value={counts.ALLOWED} label="Can sign in" sub="Including administrators" onClick={() => setFilter('ALLOWED')} pressed={filter === 'ALLOWED'} />
      </div>

      {summary.needsApproval > 0 ? (
        <p {...rise(6, 'ga-notice')} style={{ ...rise(6).style, marginTop: 14 }}>
          <GaIcon name="shield" />
          {summary.needsApproval} {summary.needsApproval === 1 ? 'learner uses an address that is' : 'learners use addresses that are'} not Gmail.
          They cannot sign in until you approve them.
        </p>
      ) : null}

      {adding ? (
        <section {...rise(6, 'ga-card')} style={{ ...rise(6).style, marginTop: 14 }}>
          <div className="ga-card-head">
            <div>
              <h2>Add a learner</h2>
              <p>They get an access code to create the account. Any email address works, because you are approving it.</p>
            </div>
          </div>
          <form className="reel-add-form" onSubmit={addLearner}>
            <label className="ga-field">
              <span>Full name</span>
              <input className="ga-input" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required minLength={2} maxLength={120} />
            </label>
            <label className="ga-field">
              <span>Email address</span>
              <input className="ga-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </label>
            <label className="ga-field">
              <span>Track</span>
              <select className="ga-select" value={form.track} onChange={(event) => setForm({ ...form, track: event.target.value })}>
                {tracks.map((track) => (
                  <option key={track.value} value={track.value}>{track.label}</option>
                ))}
              </select>
            </label>
            <label className="ga-field">
              <span>Level</span>
              <select className="ga-select" value={form.experienceLevel} onChange={(event) => setForm({ ...form, experienceLevel: event.target.value as Level })}>
                {levels.map((level) => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </label>
            <label className="ga-field">
              <span>Study hours a week</span>
              <input className="ga-input" type="number" min={1} max={40} value={form.weeklyHours} onChange={(event) => setForm({ ...form, weeklyHours: Number(event.target.value) })} required />
            </label>
            <div className="reel-add-actions">
              <button className="ga-button is-dark" type="submit" disabled={saving}>
                <GaIcon name="plus" /> {saving ? 'Adding…' : 'Add and get access code'}
              </button>
            </div>
          </form>
          {formError ? <p className="ga-notice is-error" role="alert"><GaIcon name="alert" />{formError}</p> : null}
          {added?.accessCode ? (
            <div className="reel-added" role="status">
              <p>
                <GaIcon name="check" /> {added.fullName} is approved. Send them this code, or the link, to create the account:
              </p>
              <p className="ga-code">Access code <strong>{added.accessCode}</strong></p>
              <div className="reel-added-link">
                <input className="ga-input" readOnly value={registerLink} aria-label="Account link" onFocus={(event) => event.target.select()} />
                <button
                  className="ga-button is-small"
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(registerLink).then(() => setCopied(true));
                  }}
                >
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <div {...rise(7, 'ga-toolbar')} style={{ ...rise(7).style, marginTop: 16 }}>
        <label className="ga-search-field">
          <GaIcon name="search" />
          <input
            className="ga-input"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              if (params.get('q') !== null) setParams({}, { replace: true });
            }}
            placeholder="Name or email"
            aria-label="Search learners"
          />
        </label>
        <Segmented<Filter>
          label="Filter learners"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'ALL', label: 'All', count: learners.length },
            { value: 'BLOCKED', label: 'Need approval', count: counts.BLOCKED },
            { value: 'UNCONFIRMED', label: 'Waiting', count: counts.UNCONFIRMED },
            { value: 'ALLOWED', label: 'Can sign in', count: counts.ALLOWED },
          ]}
        />
      </div>

      {error ? <p className="ga-notice is-error" role="alert"><GaIcon name="alert" />{error}</p> : null}
      {notice ? <p className="ga-notice is-success" role="status"><GaIcon name="check" />{notice}</p> : null}

      {loading && learners.length === 0 ? (
        <div className="ga-loading" role="status" aria-label="Loading accounts"><i /><i /></div>
      ) : visible.length === 0 ? (
        <div {...rise(8, 'ga-card ga-empty')}>
          <GaIcon name="users" size={22} />
          <strong>No accounts match.</strong>
          <span>Try another filter or search.</span>
        </div>
      ) : (
        <section {...rise(8, 'ga-card')} aria-busy={loading}>
          <div className="ga-table-wrap">
            <table className="ga-table reel-learners">
              <thead>
                <tr><th>Person</th><th>Email</th><th>Joined</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {visible.map((learner) => {
                  const state = standing(learner);
                  const busy = busyId === learner.id;
                  return (
                    <tr key={learner.id}>
                      <td>
                        <div className="ga-person">
                          <span className="ga-avatar">{initials(learner.fullName)}</span>
                          <div><strong>{learner.fullName}</strong><small>{learner.email}</small></div>
                        </div>
                      </td>
                      <td>
                        <span className={`ga-chip ${state.tone}`}><span className="ga-pip" />{state.label}</span>
                        {learner.status === 'SUSPENDED' ? <span className="ga-chip is-red" style={{ marginLeft: 6 }}>Suspended</span> : null}
                      </td>
                      <td>{joined(learner.createdAt)}</td>
                      <td>
                        {learner.role === 'LEARNER' ? (
                          <div className="reel-row-actions">
                            {!learner.emailApprovedAt && !learner.gmail ? (
                              <button className="ga-button is-small is-dark" type="button" disabled={busyId !== null} onClick={() => void change(learner, { emailAccess: 'approve' }, `${learner.fullName} can sign in now.`)}>
                                <GaIcon name="check" /> {busy ? 'Saving…' : 'Approve address'}
                              </button>
                            ) : null}
                            {learner.gmail && !learner.emailVerifiedAt && !learner.emailApprovedAt ? (
                              <button className="ga-button is-small" type="button" disabled={busyId !== null} onClick={() => void change(learner, { emailVerified: true }, `${learner.fullName}’s email is marked as confirmed.`)}>
                                <GaIcon name="check" /> {busy ? 'Saving…' : 'Mark as confirmed'}
                              </button>
                            ) : null}
                            {learner.emailApprovedAt ? (
                              <button className="ga-button is-small is-danger" type="button" disabled={busyId !== null} onClick={() => void change(learner, { emailAccess: 'withdraw' }, `Approval withdrawn for ${learner.fullName}.`)}>
                                <GaIcon name="x" /> {busy ? 'Saving…' : 'Withdraw approval'}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

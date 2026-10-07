import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Application, MovieSyncSummary } from '../lib/types';
import { Badge, Button, Callout, LinkButton, Spinner, TextArea } from '../components/ui';

type ApplicationFilter = 'ALL' | Application['status'];
type AdminApplication = Application & {
  phone: string | null;
  country: string | null;
  motivation: string;
};

const FILTERS: { value: ApplicationFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Declined' },
  { value: 'ENROLLED', label: 'Enrolled' },
];

const STATUS_TONE: Record<Application['status'], string> = {
  PENDING: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  APPROVED: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  REJECTED: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
  ENROLLED: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
};

function readableDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function AdminDashboard() {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [filter, setFilter] = useState<ApplicationFilter>('PENDING');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<MovieSyncSummary | null>(null);

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

  const counts = applications.reduce<Record<Application['status'], number>>(
    (total, application) => {
      total[application.status] += 1;
      return total;
    },
    { PENDING: 0, APPROVED: 0, REJECTED: 0, ENROLLED: 0 },
  );
  const visibleApplications = applications.filter((application) => filter === 'ALL' || application.status === filter);

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
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save this decision. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function syncMovies() {
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.post<{ sync: MovieSyncSummary }>('/movies/sync');
      setSyncResult(result.sync);
      setNotice(`Movie catalogue refreshed: ${result.sync.added} new titles, ${result.sync.total} total.`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not refresh the movie catalogue.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 border-b border-white/[0.08] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-reel-300">Operations</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Admin overview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Review admissions, issue learner access, and keep the film catalogue current.
          </p>
        </div>
        <Button variant="secondary" icon="refresh" loading={loading} onClick={() => void loadApplications()}>
          Refresh applications
        </Button>
      </section>

      {error ? <Callout tone="danger" title="Action failed">{error}</Callout> : null}
      {notice ? <Callout tone="success">{notice}</Callout> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Application totals">
        {FILTERS.slice(1).map(({ value, label }) => (
          <button
            type="button"
            key={value}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`border p-4 text-left transition ${filter === value ? 'border-reel-300/40 bg-reel-300/[0.08]' : 'border-white/[0.08] bg-ink-900 hover:border-white/20'}`}
          >
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{label}</span>
            <span className="mt-2 block text-2xl font-semibold tabular-nums text-white">
              {loading ? '—' : counts[value as Application['status']]}
            </span>
          </button>
        ))}
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-title text-lg">Applications</h2>
              <p className="mt-1 text-sm text-slate-500">Review commitment and motivation before making a decision.</p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg border border-white/[0.08] bg-ink-900 p-1" aria-label="Filter applications">
              {FILTERS.map(({ value, label }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${filter === value ? 'bg-white/[0.1] text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-400"><Spinner /> Loading applications</div>
            ) : visibleApplications.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-sm font-medium text-slate-200">No {filter === 'ALL' ? '' : filter.toLowerCase()} applications</p>
                <p className="mt-1 text-xs text-slate-500">New submissions will appear here.</p>
              </div>
            ) : (
              visibleApplications.map((application) => (
                <article key={application.id} className="py-5 sm:py-6">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-white">{application.fullName}</h3>
                        <Badge tone={STATUS_TONE[application.status]}>{application.status}</Badge>
                      </div>
                      <p className="mt-1 break-all text-sm text-slate-400">{application.email}</p>
                    </div>
                    <time className="shrink-0 text-xs text-slate-500" dateTime={application.submittedAt}>
                      Applied {readableDate(application.submittedAt)}
                    </time>
                  </div>

                  <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt className="text-xs text-slate-500">Track</dt><dd className="mt-1 text-slate-200">{application.trackLabel}</dd></div>
                    <div><dt className="text-xs text-slate-500">Experience</dt><dd className="mt-1 text-slate-200">{application.experienceLevel.toLowerCase()}</dd></div>
                    <div><dt className="text-xs text-slate-500">Study commitment</dt><dd className="mt-1 text-slate-200">{application.weeklyHours} hours / week</dd></div>
                    <div><dt className="text-xs text-slate-500">Location</dt><dd className="mt-1 text-slate-200">{application.country || 'Not provided'}</dd></div>
                  </dl>

                  <details className="mt-4">
                    <summary className="w-fit cursor-pointer text-xs font-medium text-brand-300 hover:text-brand-200">Read motivation and review note</summary>
                    <div className="mt-3 space-y-3 border-l border-white/10 pl-4 text-sm leading-6 text-slate-300">
                      <p className="whitespace-pre-wrap">{application.motivation}</p>
                      {application.reviewNote ? <p className="text-xs text-slate-500">Current note: {application.reviewNote}</p> : null}
                    </div>
                  </details>

                  {application.status === 'PENDING' ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <label className="block">
                        <span className="mb-1.5 block text-xs font-medium text-slate-400">Decision note</span>
                        <TextArea
                          rows={2}
                          maxLength={500}
                          value={notes[application.id] ?? ''}
                          onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                          placeholder="Optional note for the applicant"
                          className="min-h-20"
                        />
                      </label>
                      <div className="flex gap-2 sm:pb-1">
                        <Button variant="danger" size="sm" loading={busyId === application.id} disabled={busyId !== null} onClick={() => void decide(application, 'REJECTED')}>
                          Decline
                        </Button>
                        <Button variant="success" size="sm" loading={busyId === application.id} disabled={busyId !== null} onClick={() => void decide(application, 'APPROVED')}>
                          Approve
                        </Button>
                      </div>
                    </div>
                  ) : application.status === 'APPROVED' && application.accessCode ? (
                    <p className="mt-4 text-sm text-emerald-200">Learner access code: <span className="font-mono font-semibold">{application.accessCode}</span></p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>

        <aside className="h-fit border-t border-white/[0.08] pt-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <p className="eyebrow">Content operations</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Film catalogue</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Manage your hosted titles or refresh public-domain film sources.</p>
          <LinkButton to="/admin/movies" variant="secondary" icon="film" block className="mt-5">
            Manage movies
          </LinkButton>
          <LinkButton to="/admin/learning" variant="secondary" icon="library" block className="mt-2">
            Create learning course
          </LinkButton>
          <Button className="mt-2 w-full" icon="refresh" loading={syncing} onClick={() => void syncMovies()}>
            Sync movie sources
          </Button>
          {syncResult ? (
            <dl className="mt-5 space-y-3 border-t border-white/[0.08] pt-4 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">New titles</dt><dd className="font-medium text-white">{syncResult.added}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Total titles</dt><dd className="font-medium text-white">{syncResult.total}</dd></div>
              {syncResult.sources.map((source) => (
                <div key={source.name} className="flex justify-between gap-3 text-xs">
                  <dt className="text-slate-500">{source.name}</dt><dd className="text-slate-300">{source.status}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
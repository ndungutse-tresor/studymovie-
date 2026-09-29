import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError, api } from '../lib/api';
import type { User } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertContext';
import { Badge, Button, Callout, Field, PageHeader, PasswordInput, Select, TextInput } from '../components/ui';
import { Icon, type IconName } from '../components/Icon';

interface RewardHistoryItem {
  id: string;
  chapterTitle: string;
  courseTitle: string;
  status: string;
  minutesGranted: number;
  minutesWatched: number;
  movieTitle: string | null;
  grantedAt: string | null;
}

const COMMON_ZONES = [
  'UTC',
  'Africa/Kigali',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
];

const STATUS_STYLE: Record<string, { icon: IconName; tone: string; label: string }> = {
  GRANTED: { icon: 'ticket', tone: 'border-reel-400/30 bg-reel-400/10 text-reel-200', label: 'Earned' },
  ACTIVE: { icon: 'play', tone: 'border-reel-400/40 bg-reel-400/15 text-reel-100', label: 'Watching' },
  EXPIRED: { icon: 'check', tone: 'border-white/10 bg-white/[0.04] text-slate-300', label: 'Completed' },
  ENDED: { icon: 'check', tone: 'border-white/10 bg-white/[0.04] text-slate-300', label: 'Ended early' },
  FORFEITED: { icon: 'close', tone: 'border-white/10 bg-white/[0.04] text-slate-500', label: 'Forfeited' },
};

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { notificationsEnabled, requestNotifications } = useAlerts();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'UTC');
  const [profileState, setProfileState] = useState<{ saving: boolean; message: string | null; error: string | null }>({
    saving: false,
    message: null,
    error: null,
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordState, setPasswordState] = useState<{ saving: boolean; message: string | null; error: string | null }>({
    saving: false,
    message: null,
    error: null,
  });

  const [history, setHistory] = useState<RewardHistoryItem[]>([]);

  useEffect(() => {
    api
      .get<{ sessions: RewardHistoryItem[] }>('/rewards')
      .then((payload) => setHistory(payload.sessions))
      .catch(() => undefined);
  }, []);

  const zones = [...new Set([timezone, ...COMMON_ZONES])];

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setProfileState({ saving: true, message: null, error: null });
    try {
      const payload = await api.patch<{ user: User }>('/auth/me', { fullName, timezone });
      updateUser(payload.user);
      setProfileState({ saving: false, message: 'Your profile has been updated.', error: null });
    } catch (caught) {
      setProfileState({
        saving: false,
        message: null,
        error: caught instanceof ApiError ? caught.message : 'Your profile could not be saved.',
      });
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordState({ saving: true, message: null, error: null });
    try {
      await api.post('/auth/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordState({
        saving: false,
        message: 'Password changed. Other sessions have been signed out.',
        error: null,
      });
    } catch (caught) {
      setPasswordState({
        saving: false,
        message: null,
        error: caught instanceof ApiError ? caught.message : 'Your password could not be changed.',
      });
    }
  }

  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Your profile, time zone, security, and viewing history." />

      <div className="divide-y divide-white/[0.06]">
        <SettingsSection title="Profile" description="How you appear, and the time zone reminders and session times use.">
          <form onSubmit={saveProfile} className="panel">
            <div className="space-y-5 p-6">
              {profileState.error ? <Callout tone="danger">{profileState.error}</Callout> : null}
              {profileState.message ? <Callout tone="success">{profileState.message}</Callout> : null}

              <Field label="Full name" htmlFor="fullName" required>
                <TextInput id="fullName" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
              </Field>

              <Field label="Email address" htmlFor="email" hint="Your email is fixed to the application it came from.">
                <TextInput id="email" value={user?.email ?? ''} readOnly disabled />
              </Field>

              <Field label="Time zone" htmlFor="timezone" hint="Schedule reminders and session times are shown in this zone." required>
                <Select id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                  {zones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="flex justify-end border-t border-white/[0.06] bg-white/[0.015] px-6 py-4">
              <Button type="submit" loading={profileState.saving}>
                Save profile
              </Button>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection title="Password" description="Changing it signs out every other session on your account.">
          <form onSubmit={savePassword} className="panel">
            <div className="space-y-5 p-6">
              {passwordState.error ? <Callout tone="danger">{passwordState.error}</Callout> : null}
              {passwordState.message ? <Callout tone="success">{passwordState.message}</Callout> : null}

              <Field label="Current password" htmlFor="currentPassword" required>
                <PasswordInput
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Field>

              <Field
                label="New password"
                htmlFor="newPassword"
                hint="At least 10 characters, with upper case, lower case, and a number."
                required
              >
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
            </div>
            <div className="flex justify-end border-t border-white/[0.06] bg-white/[0.015] px-6 py-4">
              <Button type="submit" loading={passwordState.saving}>
                Change password
              </Button>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection
          title="Notifications"
          description="Desktop notifications let a study reminder reach you when this tab is in the background."
        >
          <div className="panel flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-slate-400 ring-1 ring-inset ring-white/10">
                <Icon name="bell" size={18} />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-100">Desktop notifications</p>
                <p className="mt-0.5 text-sm text-slate-500">In-app reminders work either way.</p>
              </div>
            </div>
            {notificationsEnabled ? (
              <Badge tone="border-emerald-400/30 bg-emerald-500/10 text-emerald-300" icon="check">
                Enabled
              </Badge>
            ) : (
              <Button variant="secondary" size="sm" icon="bell" onClick={() => void requestNotifications()}>
                Allow notifications
              </Button>
            )}
          </div>
        </SettingsSection>

        <SettingsSection title="Viewing history" description="Every session you have earned, and how much of it you used.">
          {history.length === 0 ? (
            <div className="panel p-6 text-sm text-slate-500">
              No viewing sessions yet. Pass a chapter exam to earn your first one.
            </div>
          ) : (
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left text-xs text-slate-500">
                    <th className="px-5 py-3 font-medium">Film</th>
                    <th className="px-5 py-3 font-medium">Earned by</th>
                    <th className="px-5 py-3 font-medium">Watched</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {history.map((entry) => {
                    const style = STATUS_STYLE[entry.status] ?? STATUS_STYLE.EXPIRED;
                    return (
                      <tr key={entry.id} className="transition hover:bg-white/[0.015]">
                        <td className="px-5 py-3.5 font-medium text-slate-100">{entry.movieTitle ?? 'Not started'}</td>
                        <td className="px-5 py-3.5 text-slate-400">
                          <span className="block text-slate-300">{entry.chapterTitle}</span>
                          <span className="text-xs text-slate-600">{entry.courseTitle}</span>
                        </td>
                        <td className="px-5 py-3.5 tabular-nums text-slate-400">
                          {entry.minutesWatched} / {entry.minutesGranted} min
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={style.tone} icon={style.icon}>
                            {style.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SettingsSection>
      </div>
    </>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 py-8 first:pt-0 lg:grid-cols-[16rem_1fr] lg:gap-10">
      <div>
        <h2 className="section-title">{title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

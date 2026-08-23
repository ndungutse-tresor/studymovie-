import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, api } from '../lib/api';
import type { User } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../context/AlertContext';
import { Badge, Button, Callout, Field, PageHeader, Select, TextInput } from '../components/ui';
import { Icon } from '../components/Icon';

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

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="panel space-y-5 p-6">
          <h2 className="text-sm font-semibold text-white">Profile</h2>

          {profileState.error ? <Callout tone="danger">{profileState.error}</Callout> : null}
          {profileState.message ? <Callout tone="success">{profileState.message}</Callout> : null}

          <Field label="Full name" htmlFor="fullName" required>
            <TextInput
              id="fullName"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </Field>

          <Field label="Email address" htmlFor="email" hint="Your email is fixed to the application it came from.">
            <TextInput id="email" value={user?.email ?? ''} readOnly disabled />
          </Field>

          <Field
            label="Time zone"
            htmlFor="timezone"
            hint="Schedule reminders and session times are shown in this zone."
            required
          >
            <Select id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
          </Field>

          <Button type="submit" loading={profileState.saving}>
            Save profile
          </Button>
        </form>

        <div className="space-y-6">
          <form onSubmit={savePassword} className="panel space-y-5 p-6">
            <h2 className="text-sm font-semibold text-white">Password</h2>

            {passwordState.error ? <Callout tone="danger">{passwordState.error}</Callout> : null}
            {passwordState.message ? <Callout tone="success">{passwordState.message}</Callout> : null}

            <Field label="Current password" htmlFor="currentPassword" required>
              <TextInput
                id="currentPassword"
                type="password"
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
              <TextInput
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </Field>

            <Button type="submit" loading={passwordState.saving}>
              Change password
            </Button>
          </form>

          <section className="panel p-6">
            <h2 className="text-sm font-semibold text-white">Notifications</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Desktop notifications let a study reminder reach you when this tab is in the background.
              In-app reminders work either way.
            </p>
            <div className="mt-4 flex items-center gap-3">
              {notificationsEnabled ? (
                <Badge tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-300" icon="check">
                  Enabled
                </Badge>
              ) : (
                <Button variant="secondary" size="sm" icon="bell" onClick={() => void requestNotifications()}>
                  Allow notifications
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="panel mt-6 p-6">
        <h2 className="text-sm font-semibold text-white">Viewing history</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No viewing sessions yet. Pass a chapter exam to earn your first one.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Film</th>
                  <th className="pb-3 pr-4 font-medium">Earned by</th>
                  <th className="pb-3 pr-4 font-medium">Granted</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 pr-4 text-slate-200">{entry.movieTitle ?? 'Not started'}</td>
                    <td className="py-3 pr-4 text-slate-400">
                      <span className="block">{entry.chapterTitle}</span>
                      <span className="text-xs text-slate-600">{entry.courseTitle}</span>
                    </td>
                    <td className="py-3 pr-4 text-slate-400">
                      {entry.minutesWatched} / {entry.minutesGranted} min
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <Icon
                          name={
                            entry.status === 'EXPIRED' || entry.status === 'ENDED'
                              ? 'check'
                              : entry.status === 'ACTIVE'
                                ? 'play'
                                : 'clock'
                          }
                          size={12}
                        />
                        {entry.status.toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

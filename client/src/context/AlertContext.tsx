import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { Occurrence } from '../lib/types';
import { useAuth } from './AuthContext';

interface AlertContextValue {
  due: Occurrence[];
  next: Occurrence | null;
  dismiss: (occurrence: Occurrence) => Promise<void>;
  notificationsEnabled: boolean;
  requestNotifications: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const AlertContext = createContext<AlertContextValue | null>(null);

const POLL_INTERVAL_MS = 60_000;

export function AlertProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [due, setDue] = useState<Occurrence[]>([]);
  const [next, setNext] = useState<Occurrence | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted',
  );

  // Occurrences already surfaced as a desktop notification, so a poll every
  // minute does not re-notify for the same session.
  const notified = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (!user) {
      setDue([]);
      setNext(null);
      return;
    }

    try {
      const payload = await api.get<{ due: Occurrence[]; next: Occurrence | null }>('/schedule/alerts');
      setDue(payload.due);
      setNext(payload.next);

      if (notificationsEnabled && typeof Notification !== 'undefined') {
        for (const occurrence of payload.due) {
          const key = `${occurrence.scheduleId}:${occurrence.startsAt}`;
          if (notified.current.has(key)) continue;
          notified.current.add(key);
          new Notification('Study session starting', {
            body: `${occurrence.title}${occurrence.courseTitle ? ` — ${occurrence.courseTitle}` : ''} at ${occurrence.startTime}`,
            tag: key,
          });
        }
      }
    } catch {
      // A failed poll is not worth surfacing; the next tick will retry.
    }
  }, [user, notificationsEnabled]);

  useEffect(() => {
    void refresh();
    if (!user) return;
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [user, refresh]);

  const dismiss = useCallback(async (occurrence: Occurrence) => {
    setDue((current) =>
      current.filter(
        (entry) => !(entry.scheduleId === occurrence.scheduleId && entry.startsAt === occurrence.startsAt),
      ),
    );
    try {
      await api.post(`/schedule/${occurrence.scheduleId}/acknowledge`, { occurrence: occurrence.startsAt });
    } catch {
      // Local dismissal already happened; the server copy will catch up.
    }
  }, []);

  const requestNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return false;
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    setNotificationsEnabled(granted);
    return granted;
  }, []);

  const value = useMemo(
    () => ({ due, next, dismiss, notificationsEnabled, requestNotifications, refresh }),
    [due, next, dismiss, notificationsEnabled, requestNotifications, refresh],
  );

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

export function useAlerts(): AlertContextValue {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlerts must be used inside AlertProvider');
  return context;
}

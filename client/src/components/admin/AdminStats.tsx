import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../../lib/api';

export interface AdminStats {
  applications: {
    byStatus: Record<'PENDING' | 'APPROVED' | 'REJECTED' | 'ENROLLED', number>;
    weekly: { week: string; count: number }[];
    tracks: { track: string; label: string; count: number }[];
    recent: { id: string; fullName: string; email: string; trackLabel: string; status: string; weeklyHours: number; submittedAt: string }[];
  };
  learners: { total: number; active: number; thisMonth: number; lastMonth: number; needsApproval: number };
  learning: { courses: number; chapters: number; enrollments: number; completed: number; examsTaken: number; examsPassed: number };
  rewards: { minutesGranted: number; minutesWatched: number; activeSessions: number; sessions: number };
  films: {
    total: number;
    bySource: { source: string; count: number }[];
    sources: { name: string; status: string; item_count: number; synced_at: string }[];
  };
  activity: { id: string; action: string; by: string | null; at: string }[];
}

interface AdminStatsValue {
  stats: AdminStats | null;
  error: string | null;
  refresh: () => Promise<void>;
}

const AdminStatsContext = createContext<AdminStatsValue>({ stats: null, error: null, refresh: async () => {} });

/** Loads the admin figures once for the whole workspace; pages refresh them after a change. */
export function AdminStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStats(await api.get<AdminStats>('/admin/stats'));
      setError(null);
    } catch {
      setError('The overview figures could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <AdminStatsContext.Provider value={{ stats, error, refresh }}>{children}</AdminStatsContext.Provider>;
}

export const useAdminStats = () => useContext(AdminStatsContext);

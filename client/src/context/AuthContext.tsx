import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onSessionExpired, tokenStore } from '../lib/api';
import type { AuthResponse, User } from '../lib/types';

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { accessCode: string; password: string; timezone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (next: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      if (!tokenStore.access() && !tokenStore.refresh()) {
        setReady(true);
        return;
      }
      try {
        const { user: current } = await api.get<{ user: User }>('/auth/me');
        if (!cancelled) setUser(current);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // The API client signals here when a refresh fails, so a stale tab does not
  // sit on a signed-in shell it can no longer use.
  useEffect(() => onSessionExpired(() => setUser(null)), []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<AuthResponse>('/auth/login', { email, password });
    tokenStore.save(result);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(
    async (input: { accessCode: string; password: string; timezone?: string }) => {
      const result = await api.post<AuthResponse>('/auth/register', input);
      tokenStore.save(result);
      setUser(result.user);
      return result.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.refresh();
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Signing out locally must succeed even if the server call does not.
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout, updateUser: setUser }),
    [user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

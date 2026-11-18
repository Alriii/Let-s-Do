import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, tokenStore } from '../lib/api';
import type { LoginResponse, ProfileResponse, RegisterResponse, Theme, User } from '../lib/types';

const THEME_KEY = 'letsdo.theme';

type AuthStatus = 'loading' | 'authenticated' | 'guest';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
  applyTheme: (theme: Theme) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);

  return stored === 'dark' ? 'dark' : 'light';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStore.get() ? 'loading' : 'guest',
  );

  const applyTheme = useCallback((theme: Theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME_KEY, theme);
  }, []);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    setStatus('authenticated');
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      return;
    }

    try {
      const response = await api.get<ProfileResponse>('/auth/me');
      setUser(response.user);
    } catch {
      tokenStore.clear();
      setUserState(null);
      setStatus('guest');
    }
  }, [setUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUserState(null);
      setStatus('guest');
    };

    window.addEventListener('letsdo:unauthorized', handleUnauthorized);

    return () => window.removeEventListener('letsdo:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    applyTheme(user?.preferences.theme ?? readStoredTheme());
  }, [user?.preferences.theme, applyTheme]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<LoginResponse>('/auth/login', { email, password });
      tokenStore.set(response.token);
      setUser(response.user);
      applyTheme(response.user.preferences.theme);
      return response;
    },
    [applyTheme, setUser],
  );

  const register = useCallback(
    async (email: string, password: string, passwordConfirmation: string) =>
      api.post<RegisterResponse>('/auth/register', {
        email,
        password,
        password_confirmation: passwordConfirmation,
      }),
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // The local session is cleared even if the token was already invalid.
    } finally {
      tokenStore.clear();
      setUserState(null);
      setStatus('guest');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout, refresh, setUser, applyTheme }),
    [user, status, login, register, logout, refresh, setUser, applyTheme],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

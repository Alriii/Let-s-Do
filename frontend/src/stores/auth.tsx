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
import type { LoginResponse, ProfileResponse, RegisterResponse, TextSize, Theme, User } from '../lib/types';

const THEME_KEY = 'letsdo.theme';
const TEXT_SIZE_KEY = 'letsdo.text_size';

const TEXT_SIZES: Record<TextSize, string> = {
  sm: '14px',
  md: '16px',
  lg: '18px',
  xl: '20px',
};

type AuthStatus = 'loading' | 'authenticated' | 'guest';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  textSize: TextSize;
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (
    email: string,
    password: string,
    passwordConfirmation: string,
    firstName?: string,
    lastName?: string,
  ) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
  applyTheme: (theme: Theme) => void;
  applyTextSize: (size: TextSize) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);

  return stored === 'dark' ? 'dark' : 'light';
}

function readStoredTextSize(): TextSize {
  const stored = localStorage.getItem(TEXT_SIZE_KEY) as TextSize | null;

  return stored && TEXT_SIZES[stored] ? stored : 'md';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStore.get() ? 'loading' : 'guest',
  );
  const [textSize, setTextSizeState] = useState<TextSize>(() => readStoredTextSize());

  const applyTheme = useCallback((theme: Theme) => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    localStorage.setItem(THEME_KEY, theme);
  }, []);

  const applyTextSize = useCallback((size: TextSize) => {
    const pixelValue = TEXT_SIZES[size] || '16px';
    document.documentElement.style.fontSize = pixelValue;
    localStorage.setItem(TEXT_SIZE_KEY, size);
    setTextSizeState(size);
  }, []);

  useEffect(() => {
    applyTextSize(readStoredTextSize());
  }, [applyTextSize]);

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
    async (
      email: string,
      password: string,
      passwordConfirmation: string,
      firstName?: string,
      lastName?: string,
    ) =>
      api.post<RegisterResponse>('/auth/register', {
        email,
        password,
        password_confirmation: passwordConfirmation,
        first_name: firstName,
        last_name: lastName,
        name: [firstName, lastName].filter(Boolean).join(' ') || undefined,
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
    () => ({
      user,
      status,
      textSize,
      login,
      register,
      logout,
      refresh,
      setUser,
      applyTheme,
      applyTextSize,
    }),
    [user, status, textSize, login, register, logout, refresh, setUser, applyTheme, applyTextSize],
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

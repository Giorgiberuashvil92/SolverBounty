import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/authApi';
import {
  clearSession,
  getAccessToken,
  getStoredUser,
  saveSession,
  type AuthUser,
  type PlayerProfile,
} from './session';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    partnerInsightsConsent: boolean;
  }) => Promise<void>;
  socialLogin: (input: {
    provider: 'apple' | 'google' | 'guest';
    providerUserId: string;
    email?: string;
    displayName?: string;
    idToken?: string;
  }) => Promise<void>;
  completeOnboarding: (
    input: Required<
      Pick<
        PlayerProfile,
        'primaryGame' | 'venueFocus' | 'stakesBand' | 'experience' | 'goal'
      >
    > & { formats?: string[]; partnerInsightsConsent?: boolean },
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = useCallback(async (res: { accessToken: string; user: AuthUser }) => {
    await saveSession(res.accessToken, res.user);
    setUser(res.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    const token = await getAccessToken();
    if (!token) return;
    const next = { ...me, id: me.id };
    await saveSession(token, next);
    setUser(next);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessToken();
        const stored = await getStoredUser();
        if (!token || !stored) {
          setUser(null);
          return;
        }
        try {
          await refreshUser();
        } catch {
          setUser(stored);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      await applyAuth(await authApi.login({ email, password }));
    },
    [applyAuth],
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      displayName: string;
      partnerInsightsConsent: boolean;
    }) => {
      await applyAuth(
        await authApi.register({
          email: input.email,
          password: input.password,
          displayName: input.displayName,
          analyticsConsent: true,
          partnerInsightsConsent: input.partnerInsightsConsent,
        }),
      );
    },
    [applyAuth],
  );

  const socialLogin = useCallback(
    async (input: {
      provider: 'apple' | 'google' | 'guest';
      providerUserId: string;
      email?: string;
      displayName?: string;
      idToken?: string;
    }) => {
      await applyAuth(await authApi.social(input));
    },
    [applyAuth],
  );

  const completeOnboarding = useCallback(
    async (
      input: Required<
        Pick<
          PlayerProfile,
          'primaryGame' | 'venueFocus' | 'stakesBand' | 'experience' | 'goal'
        >
      > & { formats?: string[]; partnerInsightsConsent?: boolean },
    ) => {
      const updated = await authApi.completeOnboarding(input);
      const token = await getAccessToken();
      if (!token) return;
      await saveSession(token, updated);
      setUser(updated);
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      socialLogin,
      completeOnboarding,
      refreshUser,
      logout,
    }),
    [
      user,
      loading,
      login,
      register,
      socialLogin,
      completeOnboarding,
      refreshUser,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

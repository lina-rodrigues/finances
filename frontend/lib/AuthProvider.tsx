"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  fetchMe,
  logout as logoutApi,
  type PublicUser,
  type UserPreferences,
} from "@/lib/auth-api";
import { I18nProvider, detectBrowserLocale, type Locale } from "@/lib/i18n";
import {
  applyThemePreference,
  subscribeSystemTheme,
  type ThemePreference,
} from "@/lib/theme";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  preferences: UserPreferences;
  refreshUser: () => Promise<void>;
  updateLocalPreferences: (prefs: Partial<UserPreferences>) => void;
  updateLocalName: (name: string) => void;
  logout: () => Promise<void>;
}

const defaultPreferences: UserPreferences = {
  theme: null,
  currency: "USD",
  language: detectBrowserLocale(),
  aiReportTone: "normal",
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocaleState] = useState<Locale>(detectBrowserLocale());

  const preferences = user?.preferences ?? defaultPreferences;

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (user) {
      setUser((prev) =>
        prev ? { ...prev, preferences: { ...prev.preferences, language: next } } : prev,
      );
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me);
      setLocaleState(me.preferences.language);
      applyThemePreference(me.preferences.theme);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    applyThemePreference(preferences.theme);
  }, [preferences.theme]);

  useEffect(() => {
    if (preferences.theme !== null) {
      return;
    }
    return subscribeSystemTheme((isDark) => {
      const root = document.documentElement;
      root.classList.toggle("wa-dark", isDark);
      root.classList.toggle("wa-light", !isDark);
      root.classList.remove("dark");
    });
  }, [preferences.theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const updateLocalPreferences = useCallback((prefs: Partial<UserPreferences>) => {
    setUser((prev) => {
      if (!prev) {
        return prev;
      }
      return { ...prev, preferences: { ...prev.preferences, ...prefs } };
    });
    if (prefs.language) {
      setLocaleState(prefs.language);
    }
    if (prefs.theme !== undefined) {
      applyThemePreference(prefs.theme as ThemePreference);
    }
  }, []);

  const updateLocalName = useCallback((name: string) => {
    setUser((prev) => (prev ? { ...prev, name } : prev));
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
    router.push("/login");
    router.refresh();
  }, [router]);

  const authValue = useMemo(
    () => ({
      user,
      loading,
      preferences,
      refreshUser,
      updateLocalPreferences,
      updateLocalName,
      logout,
    }),
    [user, loading, preferences, refreshUser, updateLocalPreferences, updateLocalName, logout],
  );

  return (
    <AuthContext.Provider value={authValue}>
      <I18nProvider locale={locale} setLocale={setLocale}>
        {children}
      </I18nProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

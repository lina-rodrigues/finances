export type ThemePreference = "light" | "dark" | null;
export type AppLanguage = "en" | "pt";

export interface UserPreferences {
  theme: ThemePreference;
  currency: string;
  language: AppLanguage;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
}

export interface LocaleHints {
  timezone: string;
  language: string;
}

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

async function authFetch(
  path: string,
  init?: RequestInit,
  options?: { redirectOn401?: boolean },
): Promise<Response> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (res.status === 401 && options?.redirectOn401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }

  return res;
}

async function parseAuthResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = typeof body.error === "string" ? body.error : "REQUEST_FAILED";
    throw new Error(error);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export function getLocaleHints(): LocaleHints {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  invitationCode: string;
}): Promise<PublicUser> {
  const res = await authFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ ...input, localeHints: getLocaleHints() }),
  });
  return parseAuthResponse(res);
}

export async function login(email: string, password: string): Promise<PublicUser> {
  const res = await authFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return parseAuthResponse(res);
}

export async function logout(): Promise<void> {
  const res = await authFetch("/auth/logout", { method: "POST" });
  await parseAuthResponse(res);
}

export async function fetchMe(): Promise<PublicUser> {
  const res = await authFetch("/auth/me");
  return parseAuthResponse(res);
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await authFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  await parseAuthResponse(res);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const res = await authFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
  await parseAuthResponse(res);
}

export async function updateUserProfile(input: {
  name?: string;
  preferences?: Partial<UserPreferences>;
}): Promise<PublicUser> {
  const res = await authFetch("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return parseAuthResponse(res);
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/auth-api";
import { useAuth } from "@/lib/AuthProvider";
import { useTranslation, translateError } from "@/lib/i18n";

function eventValue(event: { target: EventTarget | null }): string {
  return (event.target as HTMLInputElement & { value: string }).value;
}

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { t, locale } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      await refreshUser();
      router.push("/");
      router.refresh();
    } catch (err) {
      const code = err instanceof Error ? err.message : "REQUEST_FAILED";
      setError(translateError(code, locale));
    } finally {
      setLoading(false);
    }
  }

  return (
    <wa-card>
      <div className="wa-stack wa-gap-l">
        <div className="wa-stack wa-gap-2xs">
          <h1 className="wa-heading-m">{t("auth.login.title")}</h1>
          <p className="wa-caption-m wa-color-text-quiet">{t("auth.login.subtitle")}</p>
        </div>

        {error ? (
          <wa-callout variant="danger">
            <wa-icon slot="icon" name="circle-exclamation"></wa-icon>
            {error}
          </wa-callout>
        ) : null}

        <form onSubmit={handleSubmit} className="wa-stack wa-gap-m settings-form">
          <wa-input
            id="email"
            type="email"
            label={t("auth.login.email")}
            autocomplete="email"
            required
            value={email}
            onInput={(e) => setEmail(eventValue(e))}
          ></wa-input>
          <wa-input
            id="password"
            type="password"
            label={t("auth.login.password")}
            autocomplete="current-password"
            required
            value={password}
            onInput={(e) => setPassword(eventValue(e))}
          ></wa-input>
          <wa-button type="submit" variant="brand" disabled={loading || undefined} style={{ width: "100%" }}>
            {loading ? t("common.loading") : t("auth.login.submit")}
          </wa-button>
        </form>

        <div className="wa-stack wa-gap-s" style={{ textAlign: "center" }}>
          <Link href="/forgot-password" className="wa-caption-m">
            {t("auth.login.forgotPassword")}
          </Link>
          <p className="wa-caption-m wa-color-text-quiet">
            {t("auth.login.noAccount")}{" "}
            <Link href="/signup">{t("auth.login.signUp")}</Link>
          </p>
        </div>
      </div>
    </wa-card>
  );
}

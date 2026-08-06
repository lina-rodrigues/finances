"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { register } from "@/lib/auth-api";
import { useAuth } from "@/lib/AuthProvider";
import { useTranslation, translateError } from "@/lib/i18n";
import { showToast } from "@/lib/toast";

function eventValue(event: { target: EventTarget | null }): string {
  return (event.target as HTMLInputElement & { value: string }).value;
}

export default function SignupPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { t, locale } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ name, email, password, invitationCode });
      await refreshUser();
      router.push("/");
      router.refresh();
    } catch (err) {
      const code = err instanceof Error ? err.message : "REQUEST_FAILED";
      void showToast(translateError(code, locale), { variant: "danger" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <wa-card>
      <div className="wa-stack wa-gap-l">
        <div className="wa-stack wa-gap-2xs">
          <h1 className="wa-heading-m">{t("auth.signup.title")}</h1>
          <p className="wa-caption-m wa-color-text-quiet">{t("auth.signup.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="wa-stack wa-gap-m settings-form">
          <wa-input
            id="name"
            label={t("auth.signup.name")}
            autocomplete="name"
            required
            value={name}
            onInput={(e) => setName(eventValue(e))}
          ></wa-input>
          <wa-input
            id="email"
            type="email"
            label={t("auth.signup.email")}
            autocomplete="email"
            required
            value={email}
            onInput={(e) => setEmail(eventValue(e))}
          ></wa-input>
          <wa-input
            id="password"
            type="password"
            label={t("auth.signup.password")}
            autocomplete="new-password"
            required
            minlength={8}
            value={password}
            onInput={(e) => setPassword(eventValue(e))}
          ></wa-input>
          <wa-input
            id="invitationCode"
            label={t("auth.signup.invitationCode")}
            required
            value={invitationCode}
            onInput={(e) => setInvitationCode(eventValue(e))}
          ></wa-input>
          <wa-button type="submit" variant="brand" disabled={loading || undefined} style={{ width: "100%" }}>
            {loading ? t("common.loading") : t("auth.signup.submit")}
          </wa-button>
        </form>

        <p className="wa-caption-m wa-color-text-quiet" style={{ textAlign: "center" }}>
          {t("auth.signup.hasAccount")}{" "}
          <Link href="/login">{t("auth.signup.signIn")}</Link>
        </p>
      </div>
    </wa-card>
  );
}

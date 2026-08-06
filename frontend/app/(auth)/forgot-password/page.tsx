"use client";

import Link from "next/link";
import { useState } from "react";
import { forgotPassword } from "@/lib/auth-api";
import { useTranslation } from "@/lib/i18n";
import { showToast } from "@/lib/toast";

function eventValue(event: { target: EventTarget | null }): string {
  return (event.target as HTMLInputElement & { value: string }).value;
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
      void showToast(t("auth.forgotPassword.success"), { variant: "success", icon: "check" });
    } catch {
      void showToast(t("common.somethingWrong"), { variant: "danger" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <wa-card>
      <div className="wa-stack wa-gap-l">
        <div className="wa-stack wa-gap-2xs">
          <h1 className="wa-heading-m">{t("auth.forgotPassword.title")}</h1>
          <p className="wa-caption-m wa-color-text-quiet">{t("auth.forgotPassword.subtitle")}</p>
        </div>

        {sent ? (
          <wa-callout variant="success">
            <wa-icon slot="icon" name="check"></wa-icon>
            {t("auth.forgotPassword.success")}
          </wa-callout>
        ) : (
          <form onSubmit={handleSubmit} className="wa-stack wa-gap-m settings-form">
            <wa-input
              id="email"
              type="email"
              label={t("auth.forgotPassword.email")}
              autocomplete="email"
              required
              value={email}
              onInput={(e) => setEmail(eventValue(e))}
            ></wa-input>
            <wa-button type="submit" variant="brand" disabled={loading || undefined} style={{ width: "100%" }}>
              {loading ? t("common.loading") : t("auth.forgotPassword.submit")}
            </wa-button>
          </form>
        )}

        <p className="wa-caption-m" style={{ textAlign: "center" }}>
          <Link href="/login">{t("auth.forgotPassword.backToLogin")}</Link>
        </p>
      </div>
    </wa-card>
  );
}

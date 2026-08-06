"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { resetPassword } from "@/lib/auth-api";
import { useTranslation, translateError } from "@/lib/i18n";
import { showToast } from "@/lib/toast";

function eventValue(event: { target: EventTarget | null }): string {
  return (event.target as HTMLInputElement & { value: string }).value;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const { t, locale } = useTranslation();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      void showToast(t("auth.resetPassword.invalidToken"), { variant: "danger" });
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      void showToast(t("auth.resetPassword.success"), { variant: "success", icon: "check" });
      router.push("/login");
    } catch (err) {
      const code = err instanceof Error ? err.message : "REQUEST_FAILED";
      void showToast(translateError(code, locale), { variant: "danger" });
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <wa-card>
        <div className="wa-stack wa-gap-m">
          <wa-callout variant="danger">
            <wa-icon slot="icon" name="circle-exclamation"></wa-icon>
            {t("auth.resetPassword.invalidToken")}
          </wa-callout>
          <Link href="/login" className="wa-caption-m">
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </div>
      </wa-card>
    );
  }

  return (
    <wa-card>
      <div className="wa-stack wa-gap-l">
        <div className="wa-stack wa-gap-2xs">
          <h1 className="wa-heading-m">{t("auth.resetPassword.title")}</h1>
          <p className="wa-caption-m wa-color-text-quiet">{t("auth.resetPassword.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="wa-stack wa-gap-m settings-form">
          <wa-input
            id="password"
            type="password"
            label={t("auth.resetPassword.password")}
            autocomplete="new-password"
            required
            minlength={8}
            value={password}
            onInput={(e) => setPassword(eventValue(e))}
          ></wa-input>
          <wa-button type="submit" variant="brand" disabled={loading || undefined} style={{ width: "100%" }}>
            {loading ? t("common.loading") : t("auth.resetPassword.submit")}
          </wa-button>
        </form>
      </div>
    </wa-card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

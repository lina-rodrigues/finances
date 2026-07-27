"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { resetPassword } from "@/lib/auth-api";
import { useTranslation, translateError } from "@/lib/i18n";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  useToast,
} from "@lina-rodrigues/cotton-candy";
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      showToast(t("auth.resetPassword.invalidToken"), "error");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      showToast(t("auth.resetPassword.success"), "success");
      router.push("/login");
    } catch (err) {
      const code = err instanceof Error ? err.message : "REQUEST_FAILED";
      showToast(translateError(code, locale), "error");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-body text-sm">{t("auth.resetPassword.invalidToken")}</p>
          <Link href="/login" className="text-primary mt-4 inline-block text-sm underline-offset-2 hover:underline">
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-display text-xs normal-case">
          {t("auth.resetPassword.title")}
        </CardTitle>
        <p className="text-muted-finance text-body text-sm">{t("auth.resetPassword.subtitle")}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="finance-dialog-form space-y-3">
          <div className="space-y-1">
            <Label htmlFor="password">{t("auth.resetPassword.password")}</Label>
            <div className="finance-dialog-field">
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="pressable focus-ring w-full" disabled={loading}>
            {loading ? t("common.loading") : t("auth.resetPassword.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

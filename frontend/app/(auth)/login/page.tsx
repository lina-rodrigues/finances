"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/auth-api";
import { useAuth } from "@/lib/AuthProvider";
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
export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      await refreshUser();
      router.push("/");
      router.refresh();
    } catch (err) {
      const code = err instanceof Error ? err.message : "REQUEST_FAILED";
      showToast(translateError(code, locale), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-display text-xs normal-case">{t("auth.login.title")}</CardTitle>
        <p className="text-muted-finance text-body text-sm">{t("auth.login.subtitle")}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="finance-dialog-form space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email">{t("auth.login.email")}</Label>
            <div className="finance-dialog-field">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">{t("auth.login.password")}</Label>
            <div className="finance-dialog-field">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="pressable focus-ring w-full gap-1" disabled={loading}>
            {loading ? t("common.loading") : t("auth.login.submit")}
          </Button>
        </form>
        <div className="text-body mt-4 space-y-2 text-center text-sm">
          <Link href="/forgot-password" className="text-primary underline-offset-2 hover:underline">
            {t("auth.login.forgotPassword")}
          </Link>
          <p>
            {t("auth.login.noAccount")}{" "}
            <Link href="/signup" className="text-primary underline-offset-2 hover:underline">
              {t("auth.login.signUp")}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { register } from "@/lib/auth-api";
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
export default function SignupPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
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
      showToast(translateError(code, locale), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-display text-xs normal-case">{t("auth.signup.title")}</CardTitle>
        <p className="text-muted-finance text-body text-sm">{t("auth.signup.subtitle")}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="finance-dialog-form space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">{t("auth.signup.name")}</Label>
            <div className="finance-dialog-field">
              <Input
                id="name"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">{t("auth.signup.email")}</Label>
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
            <Label htmlFor="password">{t("auth.signup.password")}</Label>
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
          <div className="space-y-1">
            <Label htmlFor="invitationCode">{t("auth.signup.invitationCode")}</Label>
            <div className="finance-dialog-field">
              <Input
                id="invitationCode"
                required
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="pressable focus-ring w-full gap-1" disabled={loading}>
            {loading ? t("common.loading") : t("auth.signup.submit")}
          </Button>
        </form>
        <p className="text-body mt-4 text-center text-sm">
          {t("auth.signup.hasAccount")}{" "}
          <Link href="/login" className="text-primary underline-offset-2 hover:underline">
            {t("auth.signup.signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

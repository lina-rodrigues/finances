"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/pixelact-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/pixelact-ui/card";
import { Input } from "@/components/ui/pixelact-ui/input";
import { Label } from "@/components/ui/pixelact-ui/label";
import { forgotPassword } from "@/lib/auth-api";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/components/ui/pixelact-ui/toast";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
      showToast(t("auth.forgotPassword.success"), "success");
    } catch {
      showToast(t("common.somethingWrong"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-display text-xs normal-case">
          {t("auth.forgotPassword.title")}
        </CardTitle>
        <p className="text-muted-finance text-body text-sm">{t("auth.forgotPassword.subtitle")}</p>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-body text-sm">{t("auth.forgotPassword.success")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="finance-dialog-form space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">{t("auth.forgotPassword.email")}</Label>
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
            <Button type="submit" className="pressable focus-ring w-full" disabled={loading}>
              {loading ? t("common.loading") : t("auth.forgotPassword.submit")}
            </Button>
          </form>
        )}
        <p className="text-body mt-4 text-center text-sm">
          <Link href="/login" className="text-primary underline-offset-2 hover:underline">
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

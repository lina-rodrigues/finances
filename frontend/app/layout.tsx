import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/ToastProvider";
import { inter, jetbrainsMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance",
  description: "Personal finance tracker with monthly planning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="finance-light" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen bg-base-200 font-sans`}>
        <ToastProvider>
          <div className="navbar bg-base-100 shadow-sm">
            <div className="flex flex-1 items-center gap-2 px-4">
              <Icon name="logo" size="lg" />
              <span className="text-display text-xl">Finance</span>
            </div>
            <div className="flex-none px-4">
              <ThemeToggle />
            </div>
          </div>
          <main className="container mx-auto max-w-4xl p-4 md:p-6">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}

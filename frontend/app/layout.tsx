import type { Metadata } from "next";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppToaster } from "@/components/AppToaster";
import { jetbrainsMono, nunito, pressStart } from "@/lib/fonts";
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${nunito.variable} ${pressStart.variable} ${jetbrainsMono.variable} bg-dots min-h-screen font-sans`}
      >
        <AppToaster />
        <header className="flex items-center justify-between px-4 py-4 md:px-6">
          <div className="pill-title">
            <Image src="/assets/coin.svg" alt="" width={18} height={18} aria-hidden />
            <span>Finance</span>
          </div>
          <ThemeToggle />
        </header>
        <main className="container mx-auto max-w-4xl px-4 pb-8 md:px-6">{children}</main>
      </body>
    </html>
  );
}

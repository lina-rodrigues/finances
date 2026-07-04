import type { Metadata, Viewport } from "next";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppToaster } from "@/components/AppToaster";
import { jetbrainsMono, nunito, pressStart } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance",
  description: "Personal finance tracker with monthly planning",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <div className="phone-shell">
          <header className="app-header relative flex items-center justify-center px-4 py-4">
            <div className="pill-title">
              <span>Finance</span>
            </div>
            <div className="absolute right-4">
              <ThemeToggle />
            </div>
          </header>
          <main className="app-main px-4 pb-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

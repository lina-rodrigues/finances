import type { Metadata, Viewport } from "next";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toaster } from "@/components/ui/sonner";
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
        <Toaster position="top-right" />
        <div className="phone-shell">
          <header className="app-header relative flex items-center justify-center px-4 pb-4">
            <h1 className="pill-title">Finance</h1>
            <div className="absolute right-4">
              <ThemeToggle />
            </div>
          </header>
          <main className="app-main px-4 pt-4 pb-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

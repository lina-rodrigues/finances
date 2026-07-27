import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/AuthProvider";
import { ThemeFlashScript } from "@/components/ThemeFlashScript";
import { Toaster } from "@lina-rodrigues/cotton-candy";
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
        className={`${nunito.variable} ${pressStart.variable} ${jetbrainsMono.variable} bg-dots font-sans`}
      >
        <AuthProvider>
          <ThemeFlashScript />
          <Toaster position="top-right" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

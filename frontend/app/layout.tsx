import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/AuthProvider";
import { ThemeFlashScript } from "@/components/ThemeFlashScript";
import { WebAwesomeBoot } from "@/components/WebAwesomeBoot";
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
    <html
      lang="en"
      className="wa-theme-default wa-palette-rudimentary wa-light"
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.bunny.net/css?family=aleo:400|geist-mono:400|inter:400,500,600,650,700&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ThemeFlashScript />
          {children}
          <WebAwesomeBoot />
        </AuthProvider>
      </body>
    </html>
  );
}

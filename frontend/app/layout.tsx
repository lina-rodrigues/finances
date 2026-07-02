import type { Metadata } from "next";
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
    <html lang="en" data-theme="light">
      <body className="min-h-screen bg-base-200">
        <div className="navbar bg-base-100 shadow-sm">
          <div className="flex-1 px-4">
            <span className="text-xl font-bold">Finance</span>
          </div>
        </div>
        <main className="container mx-auto max-w-4xl p-4 md:p-6">{children}</main>
      </body>
    </html>
  );
}

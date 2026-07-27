import { Suspense } from "react";
import { AppMonthViewProvider } from "@/components/MonthViewShell";
import { PhoneShell } from "@lina-rodrigues/cotton-candy";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PhoneShell>
      <AppMonthViewProvider>
        <Suspense fallback={null}>
          <AppHeader />
        </Suspense>
        <main className="app-main px-4 pt-4">{children}</main>
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      </AppMonthViewProvider>
    </PhoneShell>
  );
}

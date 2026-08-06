import { AppMonthViewProvider } from "@/components/MonthViewShell";
import { AppShell } from "@/components/AppShell";
import { LastInteractionBanner } from "@/components/LastInteractionBanner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <AppMonthViewProvider>
        <LastInteractionBanner />
        {children}
      </AppMonthViewProvider>
    </AppShell>
  );
}

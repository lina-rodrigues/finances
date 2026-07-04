import { PhoneShell } from "@/components/PhoneShell";
import { SettingsButton } from "@/components/SettingsButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PhoneShell>
      <header className="app-header relative flex items-center justify-center px-4 pb-4">
        <h1 className="pill-title">Finance</h1>
        <div className="absolute right-4">
          <SettingsButton />
        </div>
      </header>
      <main className="app-main px-4 pt-4 pb-8">{children}</main>
    </PhoneShell>
  );
}

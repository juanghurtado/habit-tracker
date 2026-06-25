import { useState } from "react";
import { Toaster } from "sonner";
import { BackgroundPattern } from "./components/background-pattern.tsx";
import { DailyLog } from "./components/daily-log.tsx";
import { Gate } from "./components/gate.tsx";
import { StatsPage } from "./components/stats-page.tsx";
import type { Tab } from "./components/tab-bar.tsx";
import { TabBar } from "./components/tab-bar.tsx";
import { useAuth } from "./hooks/use-auth.tsx";
import { useHabits } from "./hooks/use-habits.ts";

export default function App() {
  const { loading, signIn, isAuthenticated } = useAuth();
  const { habits, completions } = useHabits();
  const [date, setDate] = useState(new Date());
  const [tab, setTab] = useState<Tab>("log");
  const [dismissed, setDismissed] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
        />
      </div>
    );
  }

  const gateDismissed =
    localStorage.getItem("habit-tracker-gate-dismissed") === "true" ||
    dismissed;

  const showGate =
    !(isAuthenticated || gateDismissed) &&
    habits.length === 0 &&
    completions.length === 0;

  if (showGate) {
    return (
      <Gate
        loading={false}
        onStart={() => setDismissed(true)}
        signIn={signIn}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BackgroundPattern />
      {tab === "log" ? (
        <DailyLog date={date} onDateChange={setDate} />
      ) : (
        <StatsPage />
      )}

      <TabBar activeTab={tab} onTabChange={setTab} />

      <Toaster
        position="bottom-center"
        style={{ bottom: "80px" }}
        toastOptions={{
          style: {
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            boxShadow:
              "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
            padding: "16px 20px",
            color: "var(--color-foreground)",
            fontSize: "0.875rem",
          },
        }}
      />
    </div>
  );
}

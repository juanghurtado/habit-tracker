import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { BackgroundPattern } from "./components/background-pattern.tsx";
import type { Tab } from "./components/tab-bar.tsx";
import { TabBar } from "./components/tab-bar.tsx";
import { Topbar } from "./components/topbar.tsx";
import { useAuth } from "./hooks/use-auth.tsx";
import { useHabits } from "./hooks/use-habits.ts";

const DailyLog = lazy(() =>
  import("./components/daily-log.tsx").then((m) => ({ default: m.DailyLog }))
);
const StatsPage = lazy(() =>
  import("./components/stats-page.tsx").then((m) => ({ default: m.StatsPage }))
);

export default function App() {
  const { loading, signIn, signOut, isAuthenticated, user } = useAuth();
  const { syncStatus, syncNow } = useHabits();
  const [date, setDate] = useState(new Date());
  const [tab, setTab] = useState<Tab>("log");
  const [initialSyncDone, setInitialSyncDone] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user && !initialSyncDone) {
      syncNow();
      setInitialSyncDone(true);
    }
    if (!isAuthenticated) {
      setInitialSyncDone(false);
    }
  }, [isAuthenticated, user, initialSyncDone, syncNow]);

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

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col pt-[52px]">
      <Topbar
        isAuthenticated={isAuthenticated}
        signIn={signIn}
        signOut={signOut}
        syncStatus={syncStatus}
        user={user}
      />
      <BackgroundPattern />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
              role="status"
            />
          </div>
        }
      >
        {tab === "log" ? (
          <DailyLog date={date} onDateChange={setDate} />
        ) : (
          <StatsPage />
        )}
      </Suspense>

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

import * as React from "react"
import { Toaster } from "sonner"
import { DailyLog } from "./components/daily-log"
import { StatsPage } from "./components/stats-page"
import { TabBar } from "./components/tab-bar"
import { BackgroundPattern } from "./components/background-pattern"
import type { Tab } from "./components/tab-bar"

export default function App() {
  const [date, setDate] = React.useState(new Date())
  const [tab, setTab] = React.useState<Tab>("log")

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
        style={{ bottom: "80px" }}
      />
    </div>
  )
}
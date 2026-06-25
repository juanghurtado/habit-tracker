import { ListChecks, BarChart3 } from "lucide-react"
import { cn } from "../lib/utils"

export type Tab = "log" | "stats"

interface TabBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: { id: Tab; label: string; icon: typeof ListChecks }[] = [
  { id: "log", label: "Log", icon: ListChecks },
  { id: "stats", label: "Stats", icon: BarChart3 },
]

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer select-none",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
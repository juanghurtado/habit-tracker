import { BarChart3, ListChecks } from "lucide-react";
import { cn } from "../lib/utils.ts";

export type Tab = "log" | "stats";

interface TabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof ListChecks }[] = [
  { id: "log", label: "Log", icon: ListChecks },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              className={cn(
                "flex cursor-pointer select-none items-center gap-2 rounded-full px-4 py-2 font-medium text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hoverable:hover:text-foreground"
              )}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { useState } from "react";
import type { SyncStatus } from "../hooks/use-habits.ts";
import { Button } from "./ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.tsx";

interface TopbarProps {
  hasLocalData: boolean;
  isAuthenticated: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncStatus: SyncStatus;
  user: { email: string; id: string } | null;
}

export function Topbar({
  isAuthenticated,
  user,
  signIn,
  signOut,
  hasLocalData,
  syncStatus,
}: TopbarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (isAuthenticated && user) {
    return (
      <div className="fixed top-0 right-0 left-0 z-40 flex h-[52px] items-center justify-center border-border border-b bg-card px-4">
        <div className="flex w-full max-w-md items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {syncStatus === "syncing" && (
              <Loader2 className="size-4 animate-spin text-primary" />
            )}
            {syncStatus === "pending" && (
              <Cloud className="size-4 animate-pulse" />
            )}
            {syncStatus === "idle" && <Cloud className="size-4" />}
          </div>
          <span className="min-w-0 flex-1 truncate text-foreground text-sm">
            {user.email}
          </span>
          <button
            className="shrink-0 cursor-pointer rounded-lg px-3 py-2 text-muted-foreground text-sm transition-all duration-150 hoverable:hover:bg-muted hoverable:hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
            onClick={signOut}
            type="button"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!hasLocalData) {
    return null;
  }

  async function handleSend() {
    if (!email.trim()) {
      return;
    }
    await signIn(email.trim());
    setSent(true);
  }

  return (
    <div className="fixed top-0 right-0 left-0 z-40 flex h-[52px] items-center justify-center border-border border-b bg-card px-4">
      <div className="flex w-full max-w-md items-center justify-center">
        <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
          <button
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-muted-foreground text-sm transition-all duration-150 hoverable:hover:bg-muted hoverable:hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
            onClick={() => setDialogOpen(true)}
            type="button"
          >
            <CloudOff className="size-4" />
            Enable cloud backup
          </button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enable cloud backup</DialogTitle>
            </DialogHeader>
            {sent ? (
              <p className="text-muted-foreground text-sm">
                Check your email for the sign-in link
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-muted-foreground text-sm">
                  Enter your email and we&apos;ll send you a magic link to sign
                  in.
                </p>
                <input
                  autoFocus
                  className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSend();
                    }
                  }}
                  placeholder="your@email.com"
                  type="email"
                  value={email}
                />
                <Button onClick={handleSend} variant="default">
                  Send magic link
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

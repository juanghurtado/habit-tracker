import { AlertCircle, Cloud, CloudOff, Loader2 } from "lucide-react";
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
  syncStatus,
}: TopbarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  if (isAuthenticated && user) {
    return (
      <div className="fixed top-0 right-0 left-0 z-40 flex h-[52px] items-center justify-center border-border border-b bg-card px-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {syncStatus === "syncing" && (
              <Loader2 className="size-4 animate-spin text-primary" />
            )}
            {syncStatus === "pending" && (
              <Cloud className="size-4 animate-pulse" />
            )}
            {syncStatus === "idle" && <Cloud className="size-4" />}
            <span className="text-muted-foreground text-sm">
              Cloud backup enabled
            </span>
          </div>
          <Button onClick={signOut} size="sm" variant="outline">
            Disable
          </Button>
        </div>
      </div>
    );
  }

  async function handleSend() {
    if (!email.trim() || sending) {
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      await signIn(email.trim());
      setSent(true);
    } catch (error) {
      setSendError(
        `Couldn't send magic link: ${
          error instanceof Error ? error.message : "try again later"
        }`
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed top-0 right-0 left-0 z-40 flex h-[52px] items-center justify-center border-border border-b bg-card px-4">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CloudOff className="size-4" />
          <span className="text-muted-foreground text-sm">
            Cloud backup disabled
          </span>
        </div>
        <Button
          onClick={() => {
            setSent(false);
            setSendError(null);
            setDialogOpen(true);
          }}
          size="sm"
          variant="outline"
        >
          Enable
        </Button>
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              setSent(false);
              setSendError(null);
            }
            setDialogOpen(open);
          }}
          open={dialogOpen}
        >
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
                {sendError && (
                  <div className="fade-in slide-in-from-top-1 flex animate-in items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-destructive text-sm duration-200">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}
                <input
                  autoFocus
                  className={`w-full rounded-xl border bg-bg px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring ${
                    sendError
                      ? "border-destructive ring-2 ring-destructive/30"
                      : "border-border"
                  }`}
                  disabled={sending}
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
                  {sending && <Loader2 className="animate-spin" />}
                  {sending ? "Sending..." : "Send magic link"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

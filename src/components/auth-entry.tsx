import { useEffect, useState } from "react";
import { Button } from "./ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog.tsx";

interface AuthEntryProps {
  hasLocalData: boolean;
  isAuthenticated: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  user: { email: string; id: string } | null;
}

export function AuthEntry({
  isAuthenticated,
  user,
  signIn,
  signOut,
  hasLocalData,
}: AuthEntryProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setOpen(false);
      setEmail("");
      setSent(false);
    }
  }, [isAuthenticated]);

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <span className="max-w-[120px] truncate text-muted-foreground text-xs">
          {user.email}
        </span>
        <button
          className="text-muted-foreground text-xs underline underline-offset-2 hoverable:hover:text-foreground"
          onClick={signOut}
          type="button"
        >
          Sign out
        </button>
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
    <div className="flex items-center justify-center py-2">
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogTrigger asChild>
          <button
            className="text-muted-foreground text-xs underline underline-offset-2 hoverable:hover:text-foreground"
            type="button"
          >
            Enable cloud backup
          </button>
        </DialogTrigger>
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
  );
}

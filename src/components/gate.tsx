import { useState } from "react";
import { Button } from "./ui/button.tsx";

const GATE_DISMISSED_KEY = "habit-tracker-gate-dismissed";

interface GateProps {
  loading: boolean;
  onStart: () => void;
  signIn?: (email: string) => Promise<void>;
}

export function Gate({ loading, onStart, signIn }: GateProps) {
  const [mode, setMode] = useState<"choose" | "signin" | "sent">("choose");
  const [email, setEmail] = useState("");

  if (loading) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
        />
      </div>
    );
  }

  function handleStart() {
    localStorage.setItem(GATE_DISMISSED_KEY, "true");
    onStart();
  }

  async function handleSignIn() {
    if (!(signIn && email.trim())) {
      return;
    }
    await signIn(email.trim());
    setMode("sent");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-bold text-4xl tracking-tight">The Habbit</h1>
        <p className="max-w-xs text-muted-foreground text-sm">
          Build better habits, one day at a time.
        </p>
      </div>

      {mode === "choose" && (
        <div className="flex w-full flex-col gap-3">
          <Button onClick={handleStart} size="lg">
            Start tracking
          </Button>
          <Button onClick={() => setMode("signin")} size="lg" variant="outline">
            Sign in
          </Button>
        </div>
      )}

      {mode === "signin" && (
        <div className="flex w-full flex-col gap-3">
          <input
            autoFocus
            className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSignIn();
              }
            }}
            placeholder="your@email.com"
            type="email"
            value={email}
          />
          <Button onClick={handleSignIn} size="lg">
            Send magic link
          </Button>
          <button
            className="text-muted-foreground text-sm underline-offset-2 hover:underline"
            onClick={() => setMode("choose")}
            type="button"
          >
            Back
          </button>
        </div>
      )}

      {mode === "sent" && (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm">Check your email for the magic link!</p>
          <button
            className="text-muted-foreground text-sm underline-offset-2 hover:underline"
            onClick={() => setMode("choose")}
            type="button"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}

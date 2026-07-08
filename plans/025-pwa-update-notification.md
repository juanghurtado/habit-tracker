# Plan 025: Add PWA update notification UI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b469fba..HEAD -- src/components/service-worker-registration.tsx`
> If the component has changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — adds notification UI, no behavior change to existing flows
- **Depends on**: none
- **Category**: dx/ux
- **Planned at**: commit `b469fba`, 2026-07-08
- **Issue**: —

## Why this matters

`ServiceWorkerRegistration` (`src/components/service-worker-registration.tsx`, 29 lines) already detects when a new PWA version is cached via `needRefresh[0]`. However, the component currently just returns `null` — no UI communicates to the user that an update is available. Users stay on stale versions silently until a browser refresh or navigation triggers the service worker takeover. Adding a visible "Update now" banner respects the product's zero-friction principle: one tap to update instead of waiting for a forced reload.

## Current state

`src/components/service-worker-registration.tsx`:
```tsx
import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect, useRef } from "react";

export function ServiceWorkerRegistration() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    registerType: "autoUpdate",
    onRegistered(sw) {
      intervalRef.current = setInterval(() => {
        sw?.update();
      }, 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (needRefresh[0]) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
```

The `useRegisterSW` hook from `vite-plugin-pwa/react` returns:
- `needRefresh: [boolean, ServiceWorker | undefined]` — first element is `true` when a new SW is available
- `updateServiceWorker(activate?: boolean)` — if `true`, immediately activates; otherwise waits

The PWA manifest in `vite.config.ts:16-17` identifies the app as "The Habbit" — the banner should use the app's color system.

**Design constraints** (from PRODUCT.md):
- Mobile-first, generous touch targets (44px+)
- Playful warmth — colorful, rounded (`rounded-full`)
- Dark and light, both right — use Tailwind CSS variables
- "One tap, done" — single tap to update

The existing install banner in `App.tsx:82-98` uses `bg-primary` (purple) as a top banner. This update banner should use `bg-destructive` (warm red) for visual distinction between a notification and the app's primary brand color.

## Commands you will need

| Purpose   | Command                        | Expected on success |
|-----------|--------------------------------|---------------------|
| Typecheck | `tsc --noEmit`                 | exit 0, no errors   |
| Tests     | `npm run test`                 | all pass            |
| Lint      | `npm run lint`                 | exit 0              |
| Build     | `npm run build`                | exit 0              |

## Scope

**In scope** (files to modify):
- `src/components/service-worker-registration.tsx` — add notification banner UI

**Out of scope** (do NOT touch):
- `src/sw.ts` — service worker logic unchanged
- `src/App.tsx` — mount point unchanged
- `vite.config.ts` — PWA config unchanged
- Any other file

## Git workflow

- Branch: `advisor/025-pwa-update-notification`
- Commit: `feat: add PWA update notification banner`

## Steps

### Step 1: Read the current file

Open `src/components/service-worker-registration.tsx` to understand the current import and hook usage.

### Step 2: Rewrite the component

Replace the entire file with this code:

```tsx
import { updateServiceWorker } from "virtual:pwa-register/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button.tsx";

export function ServiceWorkerRegistration() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [showing, setShowing] = useState(false);

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    registerType: "autoUpdate",
    onRegistered(sw) {
      intervalRef.current = setInterval(() => {
        sw?.update();
      }, 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (needRefresh[0]) {
      setShowing(true);
    }
  }, [needRefresh]);

  function handleUpdate() {
    setShowing(false);
    updateServiceWorker(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  if (!showing) {
    return null;
  }

  return (
    <div className="fixed top-[52px] right-0 left-0 z-10 mx-auto max-w-md bg-destructive px-4 py-3 text-primary-foreground">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-sm">Update available</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowing(false)}
            className="h-9 rounded-full bg-primary-foreground/10 px-3.5 py-1 text-xs font-medium transition-colors hover:bg-primary-foreground/20"
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            onClick={handleUpdate}
            className="h-9 rounded-full bg-background px-3.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:brightness-90"
          >
            Update
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Key design decisions**:
- Banner at `top-[52px]` — immediately below the topbar (52px tall, per `topbar.tsx:35`)
- z-index `z-10` — above page content but below topbar (z-40) and tab bar (z-30)
- Two buttons: "Dismiss" (secondary, just hides banner) and "Update" (primary action, triggers install + reload after 500ms)
- The 500ms delay between install and reload gives the service worker time to start installation, preventing reload-before-install races
- `setShowing(true)` is only triggered by the `needRefresh` effect, never by the button click — this means dismissing hides the banner, but clicking "Update" hides it first then triggers the reload

### Step 3: Create test file

Create `src/components/service-worker-registration.test.tsx`:

```ts
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ServiceWorkerRegistration } from "./service-worker-registration";

vi.mock("virtual-pwa-register/react", () => ({
  useRegisterSW: vi.fn(() => ({
    needRefresh: [false] as [boolean],
    updateServiceWorker: vi.fn(),
  })),
}));

describe("ServiceWorkerRegistration", () => {
  it("renders nothing when no update is needed", () => {
    const { container } = render(<ServiceWorkerRegistration />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the banner when needRefresh is true", async () => {
    const mockUpdate = vi.fn();
    (vi.mocked(require("virtual-pwa-register/react")).useRegisterSW as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      needRefresh: [true] as [boolean],
      updateServiceWorker: mockUpdate,
    }));
    render(<ServiceWorkerRegistration />);
    await waitFor(() => {
      expect(screen.getByText("Update available")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("calls updateServiceWorker and reloads on Update click", async () => {
    const mockUpdate = vi.fn();
    (vi.mocked(require("virtual-pwa-register/react")).useRegisterSW as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      needRefresh: [true] as [boolean],
      updateServiceWorker: mockUpdate,
    }));
    const user = userEvent.setup();
    render(<ServiceWorkerRegistration />);
    await waitFor(() => expect(screen.getByText("Update available")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Update" }));
    expect(mockUpdate).toHaveBeenCalledWith(true);
  });

  it("hides banner on Dismiss click", async () => {
    const mockUpdate = vi.fn();
    (vi.mocked(require("virtual-pwa-register/react")).useRegisterSW as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      needRefresh: [true] as [boolean],
      updateServiceWorker: mockUpdate,
    }));
    const user = userEvent.setup();
    render(<ServiceWorkerRegistration />);
    await waitFor(() => expect(screen.getByText("Update available")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Update available")).not.toBeInTheDocument();
  });
});
```

If the test mocking pattern above causes compilation errors, use this simpler approach instead — mock at the module level before each test:

```ts
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceWorkerRegistration } from "./service-worker-registration";

const mockUpdateServiceWorker = vi.fn();
const mockUseRegisterSW = vi.fn(() => ({
  needRefresh: [false] as [boolean],
  updateServiceWorker: mockUpdateServiceWorker,
}));

vi.mock("virtual-pwa-register/react", () => ({
  __esModule: true,
  useRegisterSW: mockUseRegisterSW,
}));

describe("ServiceWorkerRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRegisterSW.mockReturnValue({
      needRefresh: [false] as [boolean],
      updateServiceWorker: mockUpdateServiceWorker,
    });
  });

  it("renders nothing when no update is needed", () => {
    const { container } = render(<ServiceWorkerRegistration />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the banner when needRefresh is true", async () => {
    mockUseRegisterSW.mockReturnValue({
      needRefresh: [true] as [boolean],
      updateServiceWorker: mockUpdateServiceWorker,
    });
    render(<ServiceWorkerRegistration />);
    await waitFor(() => {
      expect(screen.getByText("Update available")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("calls updateServiceWorker and reloads on Update click", async () => {
    mockUseRegisterSW.mockReturnValue({
      needRefresh: [true] as [boolean],
      updateServiceWorker: mockUpdateServiceWorker,
    });
    const user = userEvent.setup();
    render(<ServiceWorkerRegistration />);
    await waitFor(() => expect(screen.getByText("Update available")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Update" }));
    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });

  it("hides banner on Dismiss click", async () => {
    mockUseRegisterSW.mockReturnValue({
      needRefresh: [true] as [boolean],
      updateServiceWorker: mockUpdateServiceWorker,
    });
    const user = userEvent.setup();
    render(<ServiceWorkerRegistration />);
    await waitFor(() => expect(screen.getByText("Update available")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Update available")).not.toBeInTheDocument();
  });
});
```

### Step 4: Run full verification

```bash
npm run test
npm run lint
npm run build
```

**Expected**: all tests pass, no lint errors, clean build.

## Test plan

**New test file** `src/components/service-worker-registration.test.tsx`:

1. Renders nothing when no update needed (1 test)
2. Banner appears with correct text and buttons (1 test)
3. Update button triggers `updateServiceWorker(true)` (1 test)
4. Dismiss button hides the banner (1 test)

**Verification**: `npm run test -- service-worker-registration` → 4 tests pass.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `tsc --noEmit` exits 0
- [ ] `npm run test` exits 0; 4 new tests exist and pass
- [ ] `npm run lint` exits 0
- [ ] `grep "Update available" src/components/service-worker-registration.tsx` returns 1 line
- [ ] `grep "handleUpdate" src/components/service-worker-registration.tsx` returns 2+ lines
- [ ] `src/sw.ts` is unmodified (`git diff -- src/sw.ts | wc -l` returns `0`)
- [ ] No files outside the in-scope list are modified

## STOP conditions

Stop and report back (do not improvise) if:

- `src/components/service-worker-registration.tsx` doesn't match the current state (codebase has drifted).
- The `useRegisterSW` API has a different return signature than documented (e.g., `needRefresh` is not `[boolean, SW?]`).
- The build fails because `virtual-pwa-register/react` is not available in test environment. The existing `src/__mocks__/virtual-pwa-register-react.ts` mock should handle this.

## Maintenance notes

- If future PWA features are added, the notification logic should move to a dedicated `usePwaUpdate` hook.
- The `updateServiceWorker(true)` call activates the waiting SW immediately. Without the `setTimeout`+reload delay, the new content might not be ready.
- The 500ms delay before reload may need tuning based on real install times.
- The banner uses the same dismissible pattern as the PWA install banner in `App.tsx` — reviewers should check for consistency.
- If the user is on a very slow connection, the 500ms delay might not be enough — consider increasing it if install failures are observed.

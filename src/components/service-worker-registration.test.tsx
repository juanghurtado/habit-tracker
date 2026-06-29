import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const useRegisterSW = vi.fn(() => ({
  needRefresh: [false, vi.fn()],
  offlineReady: [false, vi.fn()],
  updateServiceWorker: vi.fn(),
}));

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW,
}));

describe("ServiceWorkerRegistration", () => {
  it("calls useRegisterSW with autoUpdate and registered callback", async () => {
    const { ServiceWorkerRegistration } = await import(
      "./service-worker-registration.tsx"
    );

    render(<ServiceWorkerRegistration />);

    expect(useRegisterSW).toHaveBeenCalledWith({
      registerType: "autoUpdate",
      onRegistered: expect.any(Function),
    });
  });

  it("sets up hourly update check in onRegistered callback", async () => {
    vi.useFakeTimers();
    const { ServiceWorkerRegistration } = await import(
      "./service-worker-registration.tsx"
    );

    render(<ServiceWorkerRegistration />);

    const updateMock = vi.fn();
    const calls = useRegisterSW.mock.calls as unknown as [
      { onRegistered: (sw: { update: () => void }) => void },
    ][];
    const onRegisteredArg = calls[0][0].onRegistered;
    onRegisteredArg({ update: updateMock });

    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(updateMock).toHaveBeenCalled();

    vi.useRealTimers();
  });
});

import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./use-auth.tsx";

function createMockSupabase() {
  const listeners: Array<{
    callback: (event: string, session: unknown) => void;
  }> = [];

  const mock = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      signInWithOtp: vi.fn(async () => ({ error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      onAuthStateChange: vi.fn(
        (callback: (event: string, session: unknown) => void) => {
          listeners.push({ callback });
          return {
            data: {
              subscription: {
                unsubscribe: vi.fn(() => {
                  listeners.length = 0;
                }),
              },
            },
          };
        }
      ),
    },
    _emit(event: string, session: unknown) {
      for (const l of listeners) {
        l.callback(event, session);
      }
    },
  };

  return mock;
}

describe("useAuth", () => {
  const mockSupabase = createMockSupabase();

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthProvider supabase={mockSupabase as never}>{children}</AuthProvider>
    );
  }

  it("starts with loading true", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it("finishes loading after session check", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("calls signIn with email", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.signIn("test@example.com");
    });
    expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "test@example.com",
    });
  });

  it("calls signOut", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.signOut();
    });
    expect(mockSupabase.auth.signOut).toHaveBeenCalledOnce();
  });

  it("updates user on SIGNED_IN event", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      mockSupabase._emit("SIGNED_IN", {
        user: { id: "user-1", email: "test@example.com" },
      });
    });
    expect(result.current.user).toEqual({
      id: "user-1",
      email: "test@example.com",
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("clears user on SIGNED_OUT event", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      mockSupabase._emit("SIGNED_IN", {
        user: { id: "user-1", email: "test@example.com" },
      });
    });
    act(() => {
      mockSupabase._emit("SIGNED_OUT", null);
    });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

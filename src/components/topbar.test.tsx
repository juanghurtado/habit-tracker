import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Topbar } from "./topbar.tsx";

describe("Topbar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows email and sign out button when authenticated", () => {
    const { getByText } = render(
      <Topbar
        hasLocalData={true}
        isAuthenticated={true}
        signIn={vi.fn()}
        signOut={() => Promise.resolve()}
        syncStatus="idle"
        user={{ id: "u1", email: "test@example.com" }}
      />
    );

    expect(getByText("test@example.com")).toBeTruthy();
    expect(getByText("Sign out")).toBeTruthy();
  });

  it("shows enable cloud backup when anonymous with data", () => {
    const { getByText } = render(
      <Topbar
        hasLocalData={true}
        isAuthenticated={false}
        signIn={vi.fn()}
        signOut={() => Promise.resolve()}
        syncStatus="idle"
        user={null}
      />
    );

    expect(getByText("Enable cloud backup")).toBeTruthy();
  });

  it("renders nothing when anonymous without data", () => {
    const { container } = render(
      <Topbar
        hasLocalData={false}
        isAuthenticated={false}
        signIn={vi.fn()}
        signOut={() => Promise.resolve()}
        syncStatus="idle"
        user={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("opens dialog when clicking enable cloud backup", () => {
    const { getByText, getByPlaceholderText } = render(
      <Topbar
        hasLocalData={true}
        isAuthenticated={false}
        signIn={vi.fn()}
        signOut={() => Promise.resolve()}
        syncStatus="idle"
        user={null}
      />
    );

    act(() => {
      getByText("Enable cloud backup").dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(getByPlaceholderText("your@email.com")).toBeTruthy();
  });

  it("shows sync spinning icon when syncing", () => {
    const { container } = render(
      <Topbar
        hasLocalData={true}
        isAuthenticated={true}
        signIn={vi.fn()}
        signOut={() => Promise.resolve()}
        syncStatus="syncing"
        user={{ id: "u1", email: "test@example.com" }}
      />
    );

    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });
});

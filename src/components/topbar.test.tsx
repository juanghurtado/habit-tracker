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
        isAuthenticated={true}
        signIn={vi.fn()}
        signOut={() => Promise.resolve()}
        syncStatus="idle"
        user={{ id: "u1", email: "test@example.com" }}
      />
    );

    expect(getByText("Cloud backup enabled")).toBeTruthy();
    expect(getByText("Disable")).toBeTruthy();
  });

  it("shows enable cloud backup when anonymous without data", () => {
    const { getByText } = render(
      <Topbar
        isAuthenticated={false}
        signIn={vi.fn()}
        signOut={() => Promise.resolve()}
        syncStatus="idle"
        user={null}
      />
    );

    expect(getByText("Cloud backup disabled")).toBeTruthy();
    expect(getByText("Enable")).toBeTruthy();
  });

  it("opens dialog when clicking enable cloud backup", () => {
    const { getByText, getByPlaceholderText } = render(
      <Topbar
        isAuthenticated={false}
        signIn={vi.fn()}
        signOut={() => Promise.resolve()}
        syncStatus="idle"
        user={null}
      />
    );

    act(() => {
      getByText("Enable").dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
    });

    expect(getByPlaceholderText("your@email.com")).toBeTruthy();
  });

  it("shows sync spinning icon when syncing", () => {
    const { container } = render(
      <Topbar
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

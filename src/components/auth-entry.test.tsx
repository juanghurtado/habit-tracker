import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthEntry } from "./auth-entry.tsx";

const CLOUD_BACKUP = /enable cloud backup/i;
const CLOUD_BACKUP_HEADING = /enable cloud backup/i;
const SEND_MAGIC_LINK = /send magic link/i;
const CHECK_YOUR_EMAIL = /check your email for the sign-in link/i;
const SIGN_OUT = /sign out/i;
const YOUR_EMAIL = /your@email.com/i;

describe("AuthEntry", () => {
  const signIn = vi.fn();
  const signOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Enable cloud backup' when anonymous with data", () => {
    render(
      <AuthEntry
        hasLocalData={true}
        isAuthenticated={false}
        signIn={signIn}
        signOut={signOut}
        user={null}
      />
    );
    expect(
      screen.getByRole("button", { name: CLOUD_BACKUP })
    ).toBeInTheDocument();
  });

  it("shows email and sign-out button when authenticated", () => {
    render(
      <AuthEntry
        hasLocalData={false}
        isAuthenticated={true}
        signIn={signIn}
        signOut={signOut}
        user={{ email: "test@example.com", id: "user-1" }}
      />
    );
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SIGN_OUT })).toBeInTheDocument();
  });

  it("does NOT show anything when anonymous without data", () => {
    const { container } = render(
      <AuthEntry
        hasLocalData={false}
        isAuthenticated={false}
        signIn={signIn}
        signOut={signOut}
        user={null}
      />
    );
    expect(container.textContent).toBe("");
  });

  it("opens the dialog when clicking 'Enable cloud backup'", async () => {
    const user = userEvent.setup();
    render(
      <AuthEntry
        hasLocalData={true}
        isAuthenticated={false}
        signIn={signIn}
        signOut={signOut}
        user={null}
      />
    );
    await user.click(screen.getByRole("button", { name: CLOUD_BACKUP }));
    expect(
      screen.getByRole("heading", { name: CLOUD_BACKUP_HEADING })
    ).toBeInTheDocument();
  });

  it("shows email input in the dialog", async () => {
    const user = userEvent.setup();
    render(
      <AuthEntry
        hasLocalData={true}
        isAuthenticated={false}
        signIn={signIn}
        signOut={signOut}
        user={null}
      />
    );
    await user.click(screen.getByRole("button", { name: CLOUD_BACKUP }));
    expect(screen.getByPlaceholderText(YOUR_EMAIL)).toBeInTheDocument();
  });

  it("calls signIn with the entered email when 'Send magic link' is clicked", async () => {
    const user = userEvent.setup();
    render(
      <AuthEntry
        hasLocalData={true}
        isAuthenticated={false}
        signIn={signIn}
        signOut={signOut}
        user={null}
      />
    );
    await user.click(screen.getByRole("button", { name: CLOUD_BACKUP }));
    const emailInput = screen.getByPlaceholderText(YOUR_EMAIL);
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: SEND_MAGIC_LINK }));
    expect(signIn).toHaveBeenCalledWith("test@example.com");
  });

  it("shows confirmation message after sending magic link", async () => {
    const user = userEvent.setup();
    render(
      <AuthEntry
        hasLocalData={true}
        isAuthenticated={false}
        signIn={signIn}
        signOut={signOut}
        user={null}
      />
    );
    await user.click(screen.getByRole("button", { name: CLOUD_BACKUP }));
    const emailInput = screen.getByPlaceholderText(YOUR_EMAIL);
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: SEND_MAGIC_LINK }));
    expect(screen.getByText(CHECK_YOUR_EMAIL)).toBeInTheDocument();
  });

  it("calls signOut when sign-out button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <AuthEntry
        hasLocalData={false}
        isAuthenticated={true}
        signIn={signIn}
        signOut={signOut}
        user={{ email: "test@example.com", id: "user-1" }}
      />
    );
    await user.click(screen.getByRole("button", { name: SIGN_OUT }));
    expect(signOut).toHaveBeenCalledOnce();
  });
});

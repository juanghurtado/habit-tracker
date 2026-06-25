import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Gate } from "./gate.tsx";

const START_TRACKING = /start tracking/i;
const SIGN_IN = /sign in/i;
const YOUR_EMAIL = /your@email.com/i;
const SEND_MAGIC_LINK = /send magic link/i;
const CHECK_YOUR_EMAIL = /check your email/i;

describe("Gate", () => {
  const onStart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the app title", () => {
    render(<Gate loading={false} onStart={onStart} />);
    expect(screen.getByText("The Habbit")).toBeInTheDocument();
  });

  it("renders a 'Start tracking' button", () => {
    render(<Gate loading={false} onStart={onStart} />);
    expect(
      screen.getByRole("button", { name: START_TRACKING })
    ).toBeInTheDocument();
  });

  it("renders a 'Sign in' button", () => {
    render(<Gate loading={false} onStart={onStart} />);
    expect(screen.getByRole("button", { name: SIGN_IN })).toBeInTheDocument();
  });

  it("calls onStart when 'Start tracking' is clicked", async () => {
    const user = userEvent.setup();
    render(<Gate loading={false} onStart={onStart} />);
    await user.click(screen.getByRole("button", { name: START_TRACKING }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("dismisses the gate after 'Start tracking' is clicked", async () => {
    const user = userEvent.setup();
    render(<Gate loading={false} onStart={onStart} />);
    await user.click(screen.getByRole("button", { name: START_TRACKING }));
    expect(localStorage.getItem("habit-tracker-gate-dismissed")).toBe("true");
  });

  it("shows a spinner when loading is true", () => {
    render(<Gate loading={true} onStart={onStart} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows email input and send button when 'Sign in' is clicked", async () => {
    const user = userEvent.setup();
    render(<Gate loading={false} onStart={onStart} />);
    await user.click(screen.getByRole("button", { name: SIGN_IN }));
    expect(screen.getByPlaceholderText(YOUR_EMAIL)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: SEND_MAGIC_LINK })
    ).toBeInTheDocument();
  });

  it("calls signIn with the entered email", async () => {
    const signIn = vi.fn();
    const user = userEvent.setup();
    render(<Gate loading={false} onStart={onStart} signIn={signIn} />);
    await user.click(screen.getByRole("button", { name: SIGN_IN }));
    const emailInput = screen.getByPlaceholderText(YOUR_EMAIL);
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: SEND_MAGIC_LINK }));
    expect(signIn).toHaveBeenCalledWith("test@example.com");
  });

  it("shows confirmation message after sending magic link", async () => {
    const signIn = vi.fn();
    const user = userEvent.setup();
    render(<Gate loading={false} onStart={onStart} signIn={signIn} />);
    await user.click(screen.getByRole("button", { name: SIGN_IN }));
    const emailInput = screen.getByPlaceholderText(YOUR_EMAIL);
    await user.type(emailInput, "test@example.com");
    await user.click(screen.getByRole("button", { name: SEND_MAGIC_LINK }));
    expect(screen.getByText(CHECK_YOUR_EMAIL)).toBeInTheDocument();
  });
});

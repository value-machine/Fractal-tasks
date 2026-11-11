import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInPanel } from "./SignInPanel";
import { useAuthContext } from "@/shared/context/AuthContext";
import { useAuthBackendConfigured } from "@/shared/hooks/useAuthBackendConfigured";
import type { AuthContextValue } from "@/features/auth/types/auth.types";

vi.mock("@/shared/context/AuthContext");
vi.mock("@/shared/hooks/useAuthBackendConfigured");

const mockAuthContext = (overrides: Partial<AuthContextValue> = {}): AuthContextValue => {
  const value: AuthContextValue = {
    user: null,
    loading: false,
    error: null,
    logout: vi.fn(),
    signInWithOAuthProvider: vi.fn(),
    sendEmailSignInLink: vi.fn().mockResolvedValue(true),
    clearAuthError: vi.fn(),
    setAuthError: vi.fn(),
    ...overrides,
  };
  vi.mocked(useAuthContext).mockReturnValue(value);
  return value;
};

describe("SignInPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext();
    vi.mocked(useAuthBackendConfigured).mockReturnValue({ isConfigured: true });
  });

  it("should render GitHub, Google and email-link sign-in when Supabase is configured", () => {
    render(<SignInPanel />);

    expect(screen.getByRole("button", { name: /continue with github/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeEnabled();
    expect(screen.getByText("or")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /email me a sign-in link/i })).toBeEnabled();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /terms/i })).toBeInTheDocument();
  });

  it("should start the matching OAuth provider when a provider button is clicked", async () => {
    const auth = mockAuthContext();
    const user = userEvent.setup();
    render(<SignInPanel />);

    await user.click(screen.getByRole("button", { name: /continue with github/i }));
    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(auth.signInWithOAuthProvider).toHaveBeenNthCalledWith(1, "github", undefined);
    expect(auth.signInWithOAuthProvider).toHaveBeenNthCalledWith(2, "google", undefined);
  });

  it("should pass the return page to every sign-in method when one is given", async () => {
    const auth = mockAuthContext();
    const user = userEvent.setup();
    render(<SignInPanel returnPath="/oauth/consent?authorization_id=abc" />);

    await user.click(screen.getByRole("button", { name: /continue with github/i }));
    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.click(screen.getByRole("button", { name: /email me a sign-in link/i }));

    expect(auth.signInWithOAuthProvider).toHaveBeenCalledWith(
      "github",
      "/oauth/consent?authorization_id=abc"
    );
    expect(auth.sendEmailSignInLink).toHaveBeenCalledWith(
      "ada@example.com",
      "/oauth/consent?authorization_id=abc"
    );
  });

  it("should show the check-your-inbox message when the sign-in link was sent", async () => {
    const auth = mockAuthContext();
    const user = userEvent.setup();
    render(<SignInPanel />);

    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.click(screen.getByRole("button", { name: /email me a sign-in link/i }));

    expect(auth.sendEmailSignInLink).toHaveBeenCalledWith("ada@example.com", undefined);
    expect(await screen.findByText("Check your inbox for a sign-in link.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /use a different email/i }));

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("should keep the email form when sending the sign-in link fails", async () => {
    mockAuthContext({
      error: "Too many attempts.",
      sendEmailSignInLink: vi.fn().mockResolvedValue(false),
    });
    const user = userEvent.setup();
    render(<SignInPanel />);

    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.click(screen.getByRole("button", { name: /email me a sign-in link/i }));

    expect(screen.getByText("Too many attempts.")).toBeInTheDocument();
    expect(screen.queryByText("Check your inbox for a sign-in link.")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("should show configuration info and disable sign-in when Supabase is not configured", () => {
    vi.mocked(useAuthBackendConfigured).mockReturnValue({ isConfigured: false });

    render(<SignInPanel />);

    expect(screen.getByText(/authentication requires supabase configuration/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue with github/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /email me a sign-in link/i })).toBeDisabled();
  });
});

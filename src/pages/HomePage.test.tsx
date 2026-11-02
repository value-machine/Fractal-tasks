import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { HomePage } from "./HomePage";
import { useAuthContext } from "@/shared/context/AuthContext";
import { createDefaultAuthContextValue, renderWithProviders } from "tests/test-utils";

vi.mock("@/shared/context/AuthContext");
vi.mock("@/features/auth/hooks/useAuthCallbackHandler", () => ({
  useAuthCallbackHandler: () => ({ isProcessing: false }),
}));
vi.mock("@/features/auth/components/SignInPanel", () => ({
  SignInPanel: () => <div>sign-in panel</div>,
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(useAuthContext).mockReturnValue(createDefaultAuthContextValue());
  });

  it("should show the harness overview card when the visitor is signed out", () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByRole("link", { name: /how the harness works/i })).toBeInTheDocument();
    expect(screen.getByText("sign-in panel")).toBeInTheDocument();
  });

  it("should show the harness overview card when the visitor is signed in", () => {
    vi.mocked(useAuthContext).mockReturnValue(
      createDefaultAuthContextValue({
        user: { id: "u1", email: "a@b.co" } as ReturnType<
          typeof createDefaultAuthContextValue
        >["user"],
      })
    );

    renderWithProviders(<HomePage />);

    expect(screen.getByRole("link", { name: /how the harness works/i })).toBeInTheDocument();
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });
});

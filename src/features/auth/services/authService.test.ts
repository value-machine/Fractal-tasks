import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as authService from "./authService";
import { isSupabaseConfigured } from "@/shared/services/supabaseService";

const mockSupabase = {
  auth: {
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
    signInWithOtp: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    getSession: vi.fn(),
  },
};

vi.mock("@/shared/services/supabaseService", () => ({
  getSupabase: vi.fn(() => mockSupabase),
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock("@/shared/utils/queryClient", () => ({
  queryClient: { clear: vi.fn() },
}));

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logout", () => {
    it("should return no error when sign-out succeeds", async () => {
      vi.mocked(mockSupabase.auth.signOut).mockResolvedValue({
        error: null,
      } as unknown as Awaited<ReturnType<typeof mockSupabase.auth.signOut>>);

      const result = await authService.logout();

      expect(result.error).toBeNull();
    });
  });

  describe("signInWithOAuthProvider", () => {
    it.each(["google", "github"] as const)(
      "should redirect back to '<origin>/' when signing in with %s",
      async (provider) => {
        vi.mocked(mockSupabase.auth.signInWithOAuth).mockResolvedValue({
          data: {},
          error: null,
        } as never);

        await authService.signInWithOAuthProvider(provider);

        const [args] = vi.mocked(mockSupabase.auth.signInWithOAuth).mock.calls[0];
        expect(args.provider).toBe(provider);
        // Ends with a slash so '<origin>/**' allow-list patterns match
        expect(args.options?.redirectTo).toBe(`${window.location.origin}/`);
      }
    );
  });

  describe("sendEmailSignInLink", () => {
    it("should send a trimmed email with the '<origin>/' return address when the email is valid", async () => {
      vi.mocked(mockSupabase.auth.signInWithOtp).mockResolvedValue({
        data: {},
        error: null,
      } as never);

      const result = await authService.sendEmailSignInLink("  ada@example.com ");

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: "ada@example.com",
        options: { emailRedirectTo: `${window.location.origin}/`, shouldCreateUser: true },
      });
    });

    it("should return a validation error without calling Supabase when the email is invalid", async () => {
      const result = await authService.sendEmailSignInLink("not-an-email");

      expect(result.error?.message).toBe("Enter a valid email address.");
      expect(mockSupabase.auth.signInWithOtp).not.toHaveBeenCalled();
    });

    it("should return the mapped error when Supabase refuses to send", async () => {
      vi.mocked(mockSupabase.auth.signInWithOtp).mockResolvedValue({
        data: {},
        error: { message: "Request rate limit reached" },
      } as never);

      const result = await authService.sendEmailSignInLink("ada@example.com");

      expect(result.error?.message).toBe(
        "Too many attempts. Please wait a few minutes and try again."
      );
    });
  });

  describe("hasSignedInSession", () => {
    const withSession = (session: unknown) =>
      vi
        .mocked(mockSupabase.auth.getSession)
        .mockResolvedValue({ data: { session }, error: null } as never);

    it("should return true when a non-anonymous session exists", async () => {
      withSession({ user: { id: "u1", is_anonymous: false } });
      await expect(authService.hasSignedInSession()).resolves.toBe(true);
    });

    it("should return false when the session is anonymous", async () => {
      withSession({ user: { id: "u1", is_anonymous: true } });
      await expect(authService.hasSignedInSession()).resolves.toBe(false);
    });

    it("should return false when there is no session", async () => {
      withSession(null);
      await expect(authService.hasSignedInSession()).resolves.toBe(false);
    });

    it("should return false when reading the session throws", async () => {
      vi.mocked(mockSupabase.auth.getSession).mockRejectedValue(new Error("boom"));
      await expect(authService.hasSignedInSession()).resolves.toBe(false);
    });

    it("should return false without asking Supabase when it is not configured", async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      await expect(authService.hasSignedInSession()).resolves.toBe(false);
      expect(mockSupabase.auth.getSession).not.toHaveBeenCalled();
    });
  });

  describe("when Supabase is not configured", () => {
    beforeEach(() => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    });

    afterEach(() => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    });

    it("should return a configuration error without calling Supabase when sending a sign-in link", async () => {
      const result = await authService.sendEmailSignInLink("ada@example.com");

      expect(result.error?.message).toMatch(/configured/i);
      expect(mockSupabase.auth.signInWithOtp).not.toHaveBeenCalled();
    });

    it("should return no error without calling Supabase when logging out", async () => {
      const result = await authService.logout();

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
    });
  });
});

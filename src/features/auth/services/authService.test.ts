import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as authService from "./authService";
import { isSupabaseConfigured } from "@/shared/services/supabaseService";

const mockSupabase = {
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    signInWithOAuth: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
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

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      const mockUser = {
        id: "123",
        email: "test@example.com",
        created_at: "2024-01-01",
      };

      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      } as unknown as Awaited<ReturnType<typeof mockSupabase.auth.signInWithPassword>>);

      const result = await authService.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.error).toBeNull();
      expect(result.user).toEqual({
        id: "123",
        email: "test@example.com",
        created_at: "2024-01-01",
      });
    });

    it("should return mapped error on invalid credentials", async () => {
      const mockError = { message: "Invalid login credentials" };

      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      } as unknown as Awaited<ReturnType<typeof mockSupabase.auth.signInWithPassword>>);

      const result = await authService.login({
        email: "test@example.com",
        password: "wrongpassword",
      });

      expect(result.user).toBeNull();
      expect(result.error?.message).toBe("Invalid email or password.");
    });
  });

  describe("signUp", () => {
    it("should detect duplicate sign-up via empty identities", async () => {
      vi.mocked(mockSupabase.auth.signUp).mockResolvedValue({
        data: {
          user: { id: "123", email: "test@example.com", identities: [] },
          session: null,
        },
        error: null,
      } as unknown as Awaited<ReturnType<typeof mockSupabase.auth.signUp>>);

      const result = await authService.signUp({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.user).toBeNull();
      expect(result.error?.message).toContain("Google");
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      vi.mocked(mockSupabase.auth.signOut).mockResolvedValue({
        error: null,
      } as unknown as Awaited<ReturnType<typeof mockSupabase.auth.signOut>>);

      const result = await authService.logout();

      expect(result.error).toBeNull();
    });
  });

  describe("signInWithGoogle", () => {
    it("should send a redirect address that ends with a slash so '<origin>/**' allow-list patterns match", async () => {
      vi.mocked(mockSupabase.auth.signInWithOAuth).mockResolvedValue({
        data: {},
        error: null,
      } as never);

      await authService.signInWithGoogle();

      const [args] = vi.mocked(mockSupabase.auth.signInWithOAuth).mock.calls[0];
      expect(args.provider).toBe("google");
      expect(args.options?.redirectTo).toBe(`${window.location.origin}/`);
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

    it("should return a configuration error without calling Supabase", async () => {
      const result = await authService.login({ email: "a@b.c", password: "x" });

      expect(result.user).toBeNull();
      expect(result.error?.message).toMatch(/configured/i);
      expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should no-op logout without an error", async () => {
      const result = await authService.logout();

      expect(result.error).toBeNull();
      expect(mockSupabase.auth.signOut).not.toHaveBeenCalled();
    });
  });
});

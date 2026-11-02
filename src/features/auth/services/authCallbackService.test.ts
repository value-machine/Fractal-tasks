import type { NavigateFunction } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_REF = "testref";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const VERIFIER_KEY = `sb-${PROJECT_REF}-auth-token-code-verifier`;

const tokenResponse = (): Response =>
  new Response(
    JSON.stringify({
      access_token: "access.token.value",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "refresh-token",
      user: {
        id: "11111111-1111-1111-1111-111111111111",
        aud: "authenticated",
        role: "authenticated",
        email: "person@example.com",
        app_metadata: { provider: "google" },
        user_metadata: {},
        created_at: "2026-01-01T00:00:00Z",
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );

const asNavigate = (fn: ReturnType<typeof vi.fn>) => fn as unknown as NavigateFunction;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.doUnmock("./authService");
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("handleCodeExchange with the real Supabase client", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_SUPABASE_URL", SUPABASE_URL);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_testkey");
    fetchMock = vi.fn(async () => tokenResponse());
    vi.stubGlobal("fetch", fetchMock);
    // The page was opened by Google's return: a code in the URL and the verifier stored by the sign-in click.
    // The library stores values JSON-encoded and treats anything else as corrupted storage.
    window.localStorage.setItem(VERIFIER_KEY, JSON.stringify("v".repeat(64)));
    window.history.pushState({}, "", "/?code=google-code");
    window.sessionStorage.clear();
  });

  it("should not exchange the code a second time when the library already signed the user in", async () => {
    const { getSupabase } = await import("@/shared/services/supabaseService");
    const { handleCodeExchange } = await import("./authCallbackService");
    const navigate = vi.fn();

    const error = await handleCodeExchange("google-code", asNavigate(navigate));

    expect(error).toBeNull();
    const tokenCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("grant_type=pkce")
    );
    expect(tokenCalls).toHaveLength(1);
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
    const { data } = await getSupabase().auth.getSession();
    expect(data.session?.user.email).toBe("person@example.com");
  });
});

describe("handleCodeExchange", () => {
  const loadWith = async (authService: Record<string, unknown>) => {
    vi.resetModules();
    window.sessionStorage.clear();
    vi.doMock("./authService", () => authService);
    return import("./authCallbackService");
  };

  it("should exchange the code itself when there is no signed-in session", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const { handleCodeExchange } = await loadWith({
      hasSignedInSession: vi.fn().mockResolvedValue(false),
      exchangeCodeForSession,
    });
    const navigate = vi.fn();

    const error = await handleCodeExchange("abc", asNavigate(navigate));

    expect(error).toBeNull();
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("should skip the exchange when a signed-in session already exists", async () => {
    const exchangeCodeForSession = vi.fn();
    const { handleCodeExchange } = await loadWith({
      hasSignedInSession: vi.fn().mockResolvedValue(true),
      exchangeCodeForSession,
    });
    const navigate = vi.fn();

    await expect(handleCodeExchange("abc", asNavigate(navigate))).resolves.toBeNull();

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("should return a message and go home when the exchange fails", async () => {
    const { handleCodeExchange } = await loadWith({
      hasSignedInSession: vi.fn().mockResolvedValue(false),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: new Error("exchange failed") }),
    });
    const navigate = vi.fn();

    const error = await handleCodeExchange("abc", asNavigate(navigate));

    expect(typeof error).toBe("string");
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("should not exchange the same code twice", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    const { handleCodeExchange } = await loadWith({
      hasSignedInSession: vi.fn().mockResolvedValue(false),
      exchangeCodeForSession,
    });
    const navigate = vi.fn();

    await handleCodeExchange("same", asNavigate(navigate));
    await handleCodeExchange("same", asNavigate(navigate));

    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
});

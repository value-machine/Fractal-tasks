import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAgentToken,
  fetchAgentTokens,
  revokeAgentToken,
  SignInRequiredError,
} from "./agentTokenApiService";
import {
  getEdgeFunctionConfig,
  getSupabase,
  isSupabaseConfigured,
} from "@/shared/services/supabaseService";

vi.mock("@/shared/services/supabaseService", () => ({
  getEdgeFunctionConfig: vi.fn(),
  getSupabase: vi.fn(),
  isSupabaseConfigured: vi.fn(),
}));

const BASE = "https://proj.supabase.co/functions/v1/point-at";
const PIN = "?forceFunctionRegion=eu-west-1";

const withSession = (accessToken: string | null) =>
  vi.mocked(getSupabase).mockReturnValue({
    auth: {
      getSession: async () => ({
        data: { session: accessToken ? { access_token: accessToken } : null },
      }),
    },
  } as unknown as ReturnType<typeof getSupabase>);

describe("agentTokenApiService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(getEdgeFunctionConfig).mockReturnValue({
      baseUrl: BASE,
      headers: { apikey: "public", Authorization: "Bearer public" },
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("should send the person's session token instead of the public key when listing tokens", async () => {
    withSession("user-jwt");
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));
    await fetchAgentTokens();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/api/me/tokens${PIN}`);
    expect(init.headers.Authorization).toBe("Bearer user-jwt");
    expect(init.headers.apikey).toBe("public");
  });

  it("should post the name and revoke by id when creating and revoking", async () => {
    withSession("user-jwt");
    fetchMock.mockImplementation(async () => new Response("{}", { status: 200 }));
    await createAgentToken("Laptop");
    await revokeAgentToken("abc");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", body: '{"name":"Laptop"}' });
    expect(fetchMock.mock.calls[1][0]).toBe(`${BASE}/api/me/tokens/abc${PIN}`);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "DELETE" });
  });

  it("should refuse without calling the function when nobody is signed in", async () => {
    withSession(null);
    await expect(fetchAgentTokens()).rejects.toBeInstanceOf(SignInRequiredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should surface the function's error message when it refuses", async () => {
    withSession("user-jwt");
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Give the token a name" }), { status: 400 })
    );
    await expect(createAgentToken(" ")).rejects.toThrow("Give the token a name");
  });
});

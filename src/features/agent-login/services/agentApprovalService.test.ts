import { beforeEach, describe, expect, it, vi } from "vitest";
import { decideAgentApproval, fetchAgentApproval } from "./agentApprovalService";
import { getSupabase, isSupabaseConfigured } from "@/shared/services/supabaseService";

vi.mock("@/shared/services/supabaseService", () => ({
  getSupabase: vi.fn(),
  isSupabaseConfigured: vi.fn(),
}));

const oauth = {
  getAuthorizationDetails: vi.fn(),
  approveAuthorization: vi.fn(),
  denyAuthorization: vi.fn(),
};

describe("agentApprovalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(getSupabase).mockReturnValue({ auth: { oauth } } as unknown as ReturnType<
      typeof getSupabase
    >);
  });

  it("should describe the agent tool when the request still needs a decision", async () => {
    oauth.getAuthorizationDetails.mockResolvedValue({
      data: {
        authorization_id: "a1",
        redirect_uri: "http://localhost:3000/callback",
        client: { id: "c1", name: "Claude", uri: "https://claude.ai", logo_uri: "" },
        user: { id: "u1", email: "tom@example.com" },
        scope: "",
      },
      error: null,
    });
    await expect(fetchAgentApproval("a1")).resolves.toEqual({
      kind: "ask",
      clientName: "Claude",
      clientUri: "https://claude.ai",
      redirectUri: "http://localhost:3000/callback",
    });
  });

  it("should go straight back to the agent tool when access was approved before", async () => {
    oauth.getAuthorizationDetails.mockResolvedValue({
      data: { redirect_url: "http://localhost:3000/callback?code=x" },
      error: null,
    });
    await expect(fetchAgentApproval("a1")).resolves.toEqual({
      kind: "redirect",
      url: "http://localhost:3000/callback?code=x",
    });
  });

  it("should approve or deny without an automatic redirect and return the tool's address", async () => {
    oauth.approveAuthorization.mockResolvedValue({ data: { redirect_url: "ok-url" }, error: null });
    oauth.denyAuthorization.mockResolvedValue({ data: { redirect_url: "no-url" }, error: null });
    await expect(decideAgentApproval("a1", true)).resolves.toBe("ok-url");
    await expect(decideAgentApproval("a1", false)).resolves.toBe("no-url");
    expect(oauth.approveAuthorization).toHaveBeenCalledWith("a1", { skipBrowserRedirect: true });
    expect(oauth.denyAuthorization).toHaveBeenCalledWith("a1", { skipBrowserRedirect: true });
  });
});

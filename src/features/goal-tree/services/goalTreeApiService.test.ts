import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchGoalNode,
  fetchGoalRoleView,
  fetchGoalRoots,
  searchGoals,
} from "./goalTreeApiService";
import {
  getPointAtMcpUrl,
  PointAtNotConfiguredError,
} from "@/shared/services/pointAtFunctionService";
import { getEdgeFunctionConfig } from "@/shared/services/supabaseService";

vi.mock("@/shared/services/supabaseService", () => ({ getEdgeFunctionConfig: vi.fn() }));

const CONFIG = {
  baseUrl: "https://proj.supabase.co/functions/v1/point-at",
  headers: { apikey: "key", Authorization: "Bearer key" },
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

describe("goalTreeApiService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.mocked(getEdgeFunctionConfig).mockReturnValue(CONFIG);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("should call the roots endpoint in the database region with the apikey headers when fetching roots", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: "a" }]));

    const roots = await fetchGoalRoots();

    expect(roots).toEqual([{ id: "a" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      `${CONFIG.baseUrl}/api/roots?forceFunctionRegion=eu-west-1`,
      {
        headers: CONFIG.headers,
      }
    );
  });

  it("should encode the id when fetching a node", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ node: {} }));

    await fetchGoalNode("a/b c");

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${CONFIG.baseUrl}/api/nodes/a%2Fb%20c?forceFunctionRegion=eu-west-1`
    );
  });

  it("should encode the query when searching", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await searchGoals("peace & love");

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${CONFIG.baseUrl}/api/search?q=peace%20%26%20love&forceFunctionRegion=eu-west-1`
    );
  });

  it("should request the role path when fetching a role view", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await fetchGoalRoleView("executor");

    expect(fetchMock.mock.calls[0][0]).toBe(
      `${CONFIG.baseUrl}/api/views/executor?forceFunctionRegion=eu-west-1`
    );
  });

  it("should throw the server error message when the response is not ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "node not found" }, 404));

    await expect(fetchGoalNode("x")).rejects.toThrow("node not found");
  });

  it("should throw a status message when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 500 }));

    await expect(fetchGoalRoots()).rejects.toThrow("Request failed (500)");
  });

  it("should throw PointAtNotConfiguredError without calling fetch when Supabase is not configured", async () => {
    vi.mocked(getEdgeFunctionConfig).mockReturnValue(null);

    await expect(fetchGoalRoots()).rejects.toBeInstanceOf(PointAtNotConfiguredError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should build the MCP url when Supabase is configured", () => {
    expect(getPointAtMcpUrl()).toBe(`${CONFIG.baseUrl}/mcp?forceFunctionRegion=eu-west-1`);
  });
});

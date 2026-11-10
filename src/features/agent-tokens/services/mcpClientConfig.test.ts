import { describe, expect, it } from "vitest";
import { claudeCodeCommand, mcpJsonConfig } from "./mcpClientConfig";

const URL = "https://proj.supabase.co/functions/v1/point-at/mcp?forceFunctionRegion=eu-west-1";
const TOKEN = "pa_example";

describe("mcpClientConfig", () => {
  it("should quote the URL and pass the token as a bearer header when building the Claude Code command", () => {
    expect(claudeCodeCommand(URL, TOKEN)).toBe(
      `claude mcp add --transport http point-at "${URL}" --header "Authorization: Bearer ${TOKEN}"`
    );
  });

  it("should produce a point-at http server with the bearer header when building JSON settings", () => {
    expect(JSON.parse(mcpJsonConfig(URL, TOKEN))).toEqual({
      mcpServers: {
        "point-at": { type: "http", url: URL, headers: { Authorization: `Bearer ${TOKEN}` } },
      },
    });
  });
});

/**
 * Ready-to-paste MCP client settings for a new agent token, so nobody has to assemble a URL and
 * header by hand. The same server name is used everywhere, matching the repo's .mcp.json.
 */
const SERVER_NAME = "point-at";

/** One command that adds Point At to Claude Code for this token. */
export const claudeCodeCommand = (mcpUrl: string, token: string): string =>
  `claude mcp add --transport http ${SERVER_NAME} "${mcpUrl}" --header "Authorization: Bearer ${token}"`;

/** The `mcpServers` entry for clients configured with JSON (Cursor, Claude Code .mcp.json). */
export const mcpJsonConfig = (mcpUrl: string, token: string): string =>
  JSON.stringify(
    {
      mcpServers: {
        [SERVER_NAME]: {
          type: "http",
          url: mcpUrl,
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    },
    null,
    2
  );

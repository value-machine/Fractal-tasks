import { Client } from "npm:@modelcontextprotocol/sdk@1.32.2/client/index.js";
import { InMemoryTransport } from "npm:@modelcontextprotocol/sdk@1.32.2/inMemory.js";
import type { Tool } from "npm:@modelcontextprotocol/sdk@1.32.2/types.js";

import { createMcpServer } from "./mcpServer.ts";
import { PROCESS_DOC } from "./processDoc.ts";
import type { Store } from "./store.ts";

/** What an agent receives when it connects: instructions, tools and the process document. */
export interface AgentConnectContext {
  instructions: string;
  tools: { name: string; title: string | null; description: string; read_only: boolean }[];
  process_doc: string;
}

/**
 * Ask a real Point At MCP server, over an in-memory connection, what it tells a connecting agent.
 * Nothing is copied by hand, so the site shows exactly what agents get.
 */
export async function describeAgentConnect(store: Store): Promise<AgentConnectContext> {
  const server = createMcpServer(store, { defaultActor: "context viewer" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "point-at-context-viewer", version: "1.0.0" });
  await server.connect(serverSide);
  await client.connect(clientSide);
  try {
    const { tools } = await client.listTools();
    return {
      instructions: client.getInstructions() ?? "",
      tools: tools.map((tool: Tool) => ({
        name: tool.name,
        title: tool.title ?? null,
        description: tool.description ?? "",
        read_only: tool.annotations?.readOnlyHint === true,
      })),
      process_doc: PROCESS_DOC,
    };
  } finally {
    await client.close();
    await server.close();
  }
}

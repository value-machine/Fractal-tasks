import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "tests/test-utils";
import { AgentTokensPanel } from "./AgentTokensPanel";

const api = vi.hoisted(() => ({
  fetchPublicProfile: vi.fn(),
  fetchAgentTokens: vi.fn(),
  createAgentToken: vi.fn(),
  revokeAgentToken: vi.fn(),
  savePublicName: vi.fn(),
}));
vi.mock("@/features/agent-tokens/services/agentTokenApiService", () => api);

describe("AgentTokensPanel", () => {
  beforeEach(() => {
    api.fetchAgentTokens.mockResolvedValue([]);
  });

  it("should ask for a public name prefilled from the sign-in provider when none is chosen", async () => {
    api.fetchPublicProfile.mockResolvedValue({
      display_name: null,
      suggested_name: "tomgh",
    });
    renderWithProviders(<AgentTokensPanel userId="u1" />);
    expect(await screen.findByDisplayValue("tomgh")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create token/i })).not.toBeInTheDocument();
  });

  it("should offer tokens and show the chosen name when a public name exists", async () => {
    api.fetchPublicProfile.mockResolvedValue({ display_name: "Tom", suggested_name: null });
    renderWithProviders(<AgentTokensPanel userId="u1" />);
    expect(await screen.findByRole("button", { name: /create token/i })).toBeInTheDocument();
    expect(screen.getByText("Tom")).toBeInTheDocument();
  });
});

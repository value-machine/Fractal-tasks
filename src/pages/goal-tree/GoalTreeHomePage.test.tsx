import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "tests/test-utils";
import { GoalTreeHomePage } from "./GoalTreeHomePage";
import {
  fetchGoalRoots,
  GoalTreeNotConfiguredError,
} from "@/features/goal-tree/services/goalTreeApiService";

vi.mock("@/features/goal-tree/services/goalTreeApiService", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/goal-tree/services/goalTreeApiService")>();
  return {
    ...actual,
    fetchGoalRoots: vi.fn(),
    getGoalTreeMcpUrl: () => "https://proj.supabase.co/functions/v1/point-at/mcp",
  };
});

const root = {
  id: "r1",
  parent_id: null,
  title: "Make a sandwich this morning",
  status: "done",
  leaf_type: "human",
  labels: [],
  child_count: 0,
  done_child_count: 0,
  children: [],
};

describe("GoalTreeHomePage", () => {
  beforeEach(() => {
    vi.mocked(fetchGoalRoots).mockReset();
  });

  it("should render a tile per root and the MCP hint when roots load", async () => {
    vi.mocked(fetchGoalRoots).mockResolvedValue([root] as never);

    renderWithProviders(<GoalTreeHomePage />);

    expect(await screen.findByRole("link", { name: /make a sandwich/i })).toHaveAttribute(
      "href",
      "/nodes/r1"
    );
    expect(
      screen.getByText("https://proj.supabase.co/functions/v1/point-at/mcp")
    ).toBeInTheDocument();
  });

  it("should show the empty state when there are no roots", async () => {
    vi.mocked(fetchGoalRoots).mockResolvedValue([]);

    renderWithProviders(<GoalTreeHomePage />);

    expect(await screen.findByText(/no goals yet/i)).toBeInTheDocument();
  });

  it("should show the not-configured message when Supabase is not configured", async () => {
    vi.mocked(fetchGoalRoots).mockRejectedValue(new GoalTreeNotConfiguredError());

    renderWithProviders(<GoalTreeHomePage />);

    expect(await screen.findByText(/supabase is not configured/i)).toBeInTheDocument();
  });

  it("should show the server message when the request fails", async () => {
    vi.mocked(fetchGoalRoots).mockRejectedValue(new Error("boom"));

    renderWithProviders(<GoalTreeHomePage />);

    expect(await screen.findByText(/boom/)).toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "tests/test-utils";
import { GoalTile } from "./GoalTile";
import type {
  GoalNodeSummary,
  GoalNodeWithChildren,
} from "@/features/goal-tree/types/goalTree.types";

const summary = (overrides: Partial<GoalNodeSummary>): GoalNodeSummary => ({
  id: "n1",
  parent_id: null,
  title: "Goal",
  done_check: null,
  next_action: null,
  status: "proposed",
  leaf_type: null,
  leaf_who: null,
  leaf_what: null,
  leaf_how: null,
  split_hypothesis: null,
  split_prediction: null,
  split_assumptions: null,
  split_at: null,
  labels: [],
  claimed_by: null,
  claimed_at: null,
  verification_level: null,
  overtaken_note: null,
  unclear_reason: null,
  created_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  child_count: 0,
  done_child_count: 0,
  ...overrides,
});

describe("GoalTile", () => {
  it("should link to the node page and show nested children when the goal is split", () => {
    const node: GoalNodeWithChildren = {
      ...summary({
        id: "peace",
        title: "Achieve world peace",
        child_count: 2,
        done_child_count: 1,
      }),
      children: [
        summary({ id: "a", title: "Reduce tension in Utrecht", status: "done" }),
        summary({ id: "b", title: "Map conflicts" }),
      ],
    };

    renderWithProviders(<GoalTile node={node} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/nodes/peace");
    expect(screen.getByText("Reduce tension in Utrecht")).toBeInTheDocument();
    expect(screen.getByText("Map conflicts")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "1 of 2 subtasks closed" })).toBeInTheDocument();
  });

  it("should show the human action pill and status when the goal is a claimed human leaf", () => {
    renderWithProviders(
      <GoalTile
        node={summary({
          title: "Invite A",
          status: "in_progress",
          leaf_type: "human",
          claimed_by: "Tom",
        })}
      />
    );

    expect(screen.getByText("Human action")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Claimed by Tom")).toBeInTheDocument();
  });

  it("should show not split yet when the goal has no children and no leaf type", () => {
    renderWithProviders(<GoalTile node={summary({ title: "UBI pilot" })} />);

    expect(screen.getByText("Not split yet")).toBeInTheDocument();
  });

  it("should collapse extra children into a more counter when over the nest limit", () => {
    const children = Array.from({ length: 8 }, (_, i) =>
      summary({ id: `c${i}`, title: `Child ${i}` })
    );

    renderWithProviders(
      <GoalTile node={{ ...summary({ title: "Big", child_count: 8 }), children }} />
    );

    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });
});

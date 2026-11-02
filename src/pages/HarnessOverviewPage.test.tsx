import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "tests/test-utils";
import { HARNESS_STAGES } from "@/features/harness-overview/services/harnessOverviewContent";
import { HarnessOverviewPage } from "./HarnessOverviewPage";

describe("HarnessOverviewPage", () => {
  it("should show every loop stage with its skill name when rendered", () => {
    renderWithProviders(<HarnessOverviewPage />);

    for (const stage of HARNESS_STAGES) {
      expect(screen.getByText(stage.skill)).toBeInTheDocument();
    }
  });

  it("should show the three verdict outcomes when rendered", () => {
    renderWithProviders(<HarnessOverviewPage />);

    for (const outcome of ["Pass", "Change", "Drop"]) {
      expect(screen.getByRole("heading", { name: outcome })).toBeInTheDocument();
    }
  });

  it("should mark the two steps where the owner steps in with a badge when rendered", () => {
    renderWithProviders(<HarnessOverviewPage />);

    expect(screen.getAllByText("Your turn")).toHaveLength(2);
    expect(screen.queryByText(/stop 1/i)).not.toBeInTheDocument();
  });
});

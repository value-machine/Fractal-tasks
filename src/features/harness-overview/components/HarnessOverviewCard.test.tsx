import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "tests/test-utils";
import { HarnessOverviewCard } from "./HarnessOverviewCard";

describe("HarnessOverviewCard", () => {
  it("should link to the harness overview route when rendered", () => {
    renderWithProviders(<HarnessOverviewCard />);

    expect(screen.getByRole("link", { name: /how the harness works/i })).toHaveAttribute(
      "href",
      "/harness"
    );
  });

  it("should show the overview preview image with alt text when rendered", () => {
    renderWithProviders(<HarnessOverviewCard />);

    expect(screen.getByRole("img", { name: /harness/i })).toHaveAttribute(
      "src",
      "/harness-overview.png"
    );
  });
});

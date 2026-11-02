#!/usr/bin/env bash
# Fixture for this case: sources the shared scaffold (meta-write-skill/scripts/eval-scaffold.sh,
# copied into the eval plugin by run-evals.sh), then sets up the situation the prompt assumes.
source "$(dirname "$0")/../../lib/eval-scaffold.sh"
git checkout -q -b feat/app-version-profile-menu
version_brief XS
mkdir -p "$(dirname 'src/layouts/ProfileMenu/ProfileVersion.tsx')"
cat > 'src/layouts/ProfileMenu/ProfileVersion.tsx' <<'SRC'
import { version } from "../../../package.json";

/** Shows the running app version in the profile menu. */
export function ProfileVersion(): JSX.Element {
  return <p className="px-2 py-1 text-xs text-muted-foreground">v{version}</p>;
}
SRC
mkdir -p "$(dirname 'src/layouts/ProfileMenu/ProfileVersion.test.tsx')"
cat > 'src/layouts/ProfileMenu/ProfileVersion.test.tsx' <<'SRC'
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { version } from "../../../package.json";

import { ProfileVersion } from "./ProfileVersion";

describe("ProfileVersion", () => {
  it("should show the package version when rendered", () => {
    render(<ProfileVersion />);
    expect(screen.getByText(`v${version}`)).toBeInTheDocument();
  });
});
SRC
commit_all "feat(layouts): show app version in the profile menu"

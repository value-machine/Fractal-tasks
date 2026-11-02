import { HarnessOverviewView } from "@/features/harness-overview/components/HarnessOverviewView";
import {
  HARNESS_GUARDRAILS,
  HARNESS_OUTCOMES,
  HARNESS_STAGES,
  HARNESS_UPKEEP_SKILLS,
} from "@/features/harness-overview/services/harnessOverviewContent";
import { appScrollContentClassName } from "@/shared/theme/appViewLayout";
import { cn } from "@/shared/utils/cn";

const PAGE_TITLE = "Plate Harness Overview";
const PAGE_DESCRIPTION =
  "How work moves through the Plate Harness agent loop: the stages, the helper skills, the guardrails, and where you step in.";

export const HarnessOverviewPage = () => {
  return (
    <div className={cn(appScrollContentClassName, "items-stretch")}>
      <title>{PAGE_TITLE}</title>
      <meta name="description" content={PAGE_DESCRIPTION} />
      <HarnessOverviewView
        stages={HARNESS_STAGES}
        outcomes={HARNESS_OUTCOMES}
        guardrails={HARNESS_GUARDRAILS}
        upkeepSkills={HARNESS_UPKEEP_SKILLS}
      />
    </div>
  );
};

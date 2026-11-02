import { Card, CardContent, CardTitle } from "@/components/common/Card";
import { cn } from "@/shared/utils/cn";
import type {
  HarnessGuardrailGroup,
  HarnessHelper,
  HarnessOutcome,
  HarnessStage,
} from "../types/harnessOverview.types";
import { HarnessLoopStage } from "./HarnessLoopStage";

const outcomeClassNames: Record<string, string> = {
  Pass: "border-success text-success",
  Change: "border-primary text-primary",
  Drop: "border-destructive text-destructive",
};

const legendSwatchClassName = "inline-block size-3 rounded-sm border-2";

/** Title, lead-in and the legend for the three kinds of box. */
const HarnessOverviewHeader = () => (
  <header className="flex flex-col gap-2">
    <h1 className="font-heading text-3xl font-bold tracking-tight text-balance">
      How work moves through the harness
    </h1>
    <p className="max-w-[62ch] text-muted-foreground">
      Every change, big or small, goes around the same loop. You decide what to build and whether
      the result is right. The agent does the steps in between.
    </p>
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <i className={cn(legendSwatchClassName, "border-border bg-card")} />
        Loop stage (a skill)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className={cn(legendSwatchClassName, "border-primary bg-primary/10")} />
        Where you step in
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className={cn(legendSwatchClassName, "border-secondary bg-secondary/10")} />
        Helper skill or automatic check, used when needed
      </span>
    </p>
  </header>
);

interface HarnessOverviewViewProps {
  stages: HarnessStage[];
  outcomes: HarnessOutcome[];
  guardrails: HarnessGuardrailGroup[];
  upkeepSkills: HarnessHelper[];
}

/** The designed, plain-language overview of the agent harness: loop, helpers, guardrails, upkeep. */
export const HarnessOverviewView = ({
  stages,
  outcomes,
  guardrails,
  upkeepSkills,
}: HarnessOverviewViewProps) => {
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-8 py-4 text-left sm:py-6">
      <HarnessOverviewHeader />

      <section aria-label="The loop">
        <ol className="flex flex-col">
          {stages.map((stage) => (
            <HarnessLoopStage key={stage.skill} stage={stage} />
          ))}
        </ol>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {outcomes.map((outcome) => (
            <Card
              key={outcome.title}
              hoverable={false}
              className={cn("max-w-none gap-1 py-3", outcomeClassNames[outcome.title])}
            >
              <CardContent className="flex flex-col gap-1">
                <h3 className="font-heading font-semibold">{outcome.title}</h3>
                <p className="text-sm text-muted-foreground">{outcome.summary}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="harness-guardrails">
        <div>
          <h2 id="harness-guardrails" className="font-heading text-xl font-bold">
            Guardrails that apply to every stage
          </h2>
          <p className="max-w-[64ch] text-muted-foreground">
            The agent cannot skip these. Rule files are always loaded, and automated checks run
            before every commit and again in CI.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {guardrails.map((group) => (
            <Card
              key={group.title}
              hoverable={false}
              className="max-w-none gap-2 border-secondary py-3"
            >
              <CardContent className="flex flex-col gap-2">
                <CardTitle className="font-heading">{group.title}</CardTitle>
                <ul className="list-disc pl-5 text-sm">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="harness-upkeep">
        <div>
          <h2 id="harness-upkeep" className="font-heading text-xl font-bold">
            Harness upkeep
          </h2>
          <p className="max-w-[64ch] text-muted-foreground">
            Separate from the loop. Used when the harness itself needs changing.
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {upkeepSkills.map((helper) => (
            <li key={helper.name} className="rounded-md border bg-card px-3 py-1.5">
              <span className="block font-mono text-xs break-all text-primary">{helper.name}</span>
              <span className="text-sm">{helper.summary}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

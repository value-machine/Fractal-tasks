import { UserRound } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/common/Card";
import { cn } from "@/shared/utils/cn";
import type { HarnessStage } from "../types/harnessOverview.types";

const skillNameClassName = "font-mono text-xs break-all";

interface HarnessLoopStageProps {
  stage: HarnessStage;
}

/** One loop stage with its helper skills beside it (below it on phones) and the arrow to the next. */
export const HarnessLoopStage = ({ stage }: HarnessLoopStageProps) => {
  const isOwnerStep = Boolean(stage.ownerStep);

  return (
    <li className="flex flex-col">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card
          hoverable={false}
          className={cn(
            "max-w-none gap-1 py-3",
            isOwnerStep && "border-primary bg-primary/10 elevation-md"
          )}
        >
          <CardContent className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span
                className={cn(skillNameClassName, "rounded-sm bg-muted px-1.5 py-0.5 text-primary")}
              >
                {stage.skill}
              </span>
              {isOwnerStep && (
                <Badge variant="primary">
                  <UserRound />
                  Your turn
                </Badge>
              )}
            </div>
            <CardTitle className="font-heading text-base leading-snug">{stage.title}</CardTitle>
            <CardDescription>{stage.summary}</CardDescription>
          </CardContent>
        </Card>

        {stage.helpers.length > 0 && (
          <ul
            className="flex flex-col justify-center gap-2"
            aria-label={`Helpers for ${stage.skill}`}
          >
            {stage.helpers.map((helper) => (
              <li
                key={helper.name}
                className="rounded-md border border-dashed border-secondary bg-secondary/10 px-3 py-1.5"
              >
                <span className={cn(skillNameClassName, "block text-secondary")}>
                  {helper.name}
                </span>
                <span className="text-sm">{helper.summary}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {stage.handoff && (
        <div className="ml-6 flex h-7 items-center gap-2 text-xs text-muted-foreground" aria-hidden>
          <span className="h-full w-0.5 bg-border" />
          {stage.handoff}
        </div>
      )}
    </li>
  );
};

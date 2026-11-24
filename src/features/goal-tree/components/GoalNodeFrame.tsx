import { Alert } from "@/components/common/Alert";
import { cn } from "@/shared/utils/cn";
import { formatRelativeTime } from "@/shared/utils/formatRelativeTime";
import type { GoalEstimate, GoalNodeSummary } from "@/features/goal-tree/types/goalTree.types";
import {
  describeGoalDuration,
  describeGoalMinutes,
  describeGoalRequirement,
  GOAL_VERIFICATION_LABELS,
} from "@/features/goal-tree/types/goalTreeLabels";
import {
  GoalLabelPills,
  GoalLeafPill,
  GoalPrivatePill,
  GoalStatusPill,
} from "@/features/goal-tree/components/GoalPills";

const Fact = ({ term, children }: { term: string; children: string }) => (
  <div className="text-sm">
    <dt className="mb-0.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
      {term}
    </dt>
    <dd className="m-0">{children}</dd>
  </div>
);

/** "About 5 hours over 4 open steps (1 without an estimate)"; null when nothing is open below. */
const describeEstimate = (estimate: GoalEstimate | null | undefined): string | null => {
  if (!estimate?.open_leaves) return null;
  const known = estimate.open_leaves - estimate.unestimated_leaves;
  if (known === 0) return `${estimate.open_leaves} open steps, none estimated yet`;
  const missing = estimate.unestimated_leaves
    ? ` (${estimate.unestimated_leaves} without an estimate)`
    : "";
  return `About ${describeGoalMinutes(estimate.open_leaf_minutes)} over ${estimate.open_leaves} open steps${missing}`;
};

const factsOf = (node: GoalNodeSummary, estimate?: GoalEstimate | null): [string, string][] => {
  const facts: [string, string | null][] = [
    ["How we know it worked", node.done_check],
    ["Next action", node.next_action],
    ["Time", describeGoalDuration(node.duration_minutes)],
    ["Time left below", describeEstimate(estimate)],
    [
      "Needs",
      node.requirements.length ? node.requirements.map(describeGoalRequirement).join(", ") : null,
    ],
    [
      "Verification",
      node.verification_level ? (GOAL_VERIFICATION_LABELS[node.verification_level] ?? null) : null,
    ],
    [
      "Claimed",
      node.claimed_by && node.claimed_at
        ? `${node.claimed_by}, ${formatRelativeTime(node.claimed_at)}`
        : null,
    ],
  ];
  return facts.filter((fact): fact is [string, string] => Boolean(fact[1]));
};

const SplitReasoning = ({ node }: { node: GoalNodeSummary }) => {
  if (!node.split_hypothesis) return null;
  return (
    <div className="mt-4 rounded-card bg-muted p-4 text-sm">
      <p className="my-1">
        <b>Why these subtasks complete it:</b> {node.split_hypothesis}
      </p>
      {node.split_prediction && (
        <p className="my-1">
          <b>Prediction:</b> {node.split_prediction}
        </p>
      )}
      {node.split_assumptions && (
        <p className="my-1">
          <b>Rests on:</b> {node.split_assumptions}
          {node.split_at && (
            <small className="text-muted-foreground">
              {" "}
              (split {formatRelativeTime(node.split_at)})
            </small>
          )}
        </p>
      )}
    </div>
  );
};

const HumanInstruction = ({ node }: { node: GoalNodeSummary }) => {
  if (node.leaf_type !== "human") return null;
  return (
    <div className="mt-4 rounded-card border border-warning/40 bg-warning/10 p-4">
      <h2 className="mb-2.5 text-xs font-semibold tracking-wider text-warning uppercase">
        Human action
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2">
        {node.leaf_who && <Fact term="Who">{node.leaf_who}</Fact>}
        {node.leaf_how && <Fact term="How">{node.leaf_how}</Fact>}
        {node.leaf_follow_up && <Fact term="Then">{node.leaf_follow_up}</Fact>}
      </dl>
      {node.leaf_what && (
        <blockquote className="mt-2 border-l-4 border-warning pl-3 whitespace-pre-wrap">
          {node.leaf_what}
        </blockquote>
      )}
    </div>
  );
};

/**
 * The focused goal: status, labels, the three questions (title, done check, next action), the
 * split reasoning and the human instructions when the goal is a human leaf.
 */
export const GoalNodeFrame = ({
  node,
  estimate,
}: {
  node: GoalNodeSummary;
  estimate?: GoalEstimate | null;
}) => {
  const facts = factsOf(node, estimate);
  return (
    <article className="rounded-card border bg-card p-5 elevation-sm sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <GoalStatusPill status={node.status} />
        <GoalLeafPill leafType={node.leaf_type} />
        <GoalPrivatePill visibility={node.visibility} />
        <GoalLabelPills labels={node.labels} />
      </div>
      <h1
        className={cn(
          "mt-2 max-w-[30ch] font-heading text-3xl leading-tight font-semibold",
          node.status === "overtaken" && "text-muted-foreground line-through"
        )}
      >
        {node.title}
      </h1>
      {facts.length > 0 && (
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {facts.map(([term, value]) => (
            <Fact key={term} term={term}>
              {value}
            </Fact>
          ))}
        </dl>
      )}
      <SplitReasoning node={node} />
      <HumanInstruction node={node} />
      {node.unclear_reason && (
        <Alert variant="warning" className="mt-3">
          Bounced back as unclear: {node.unclear_reason}
        </Alert>
      )}
      {node.overtaken_note && (
        <Alert variant="info" className="mt-3">
          Overtaken: {node.overtaken_note}
        </Alert>
      )}
    </article>
  );
};

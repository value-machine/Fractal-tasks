import type {
  AgentContextScope,
  AgentFocusPayload,
} from "@/features/agent-context/types/agentContext.types";

/**
 * Which tasks an agent sees when it focuses one: every task the payload names. Relations to
 * tasks outside the focused tree are listed apart, because the graph only draws that tree.
 */
export const agentContextScope = (
  payload: AgentFocusPayload,
  treeIds: ReadonlySet<string>
): AgentContextScope => {
  const named = [
    payload.node,
    ...(payload.ancestors ?? []),
    ...(payload.siblings ?? []),
    ...(payload.children ?? []).flatMap((child) => [child, ...(child.children ?? [])]),
    ...(payload.relations ?? []),
  ];
  const inContext = new Set(named.map((task) => task.id));
  const elsewhere = (payload.relations ?? [])
    .filter((relation) => !treeIds.has(relation.id))
    .map(({ id, title }) => ({ id, title }));
  return { rootId: payload.root?.id ?? payload.node.id, inContext, elsewhere };
};

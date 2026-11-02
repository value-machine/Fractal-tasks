import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchGoalNode,
  fetchGoalRoleView,
  fetchGoalRoots,
  searchGoals,
} from "@/features/goal-tree/services/goalTreeApiService";
import type { GoalRole } from "@/features/goal-tree/types/goalTree.types";

/** Hierarchical query keys: [resource, subResource, ...params]. */
export const goalTreeKeys = {
  all: ["goal-tree"] as const,
  roots: () => [...goalTreeKeys.all, "roots"] as const,
  node: (id: string) => [...goalTreeKeys.all, "node", id] as const,
  search: (query: string) => [...goalTreeKeys.all, "search", query] as const,
  roleView: (role: GoalRole) => [...goalTreeKeys.all, "role-view", role] as const,
};

/** Read-only data: agents change it elsewhere, so refetch on focus and keep staleness short. */
const GOAL_TREE_STALE_MS = 15_000;

export const useGoalRoots = () =>
  useQuery({
    queryKey: goalTreeKeys.roots(),
    queryFn: fetchGoalRoots,
    staleTime: GOAL_TREE_STALE_MS,
  });

export const useGoalNode = (id: string) =>
  useQuery({
    queryKey: goalTreeKeys.node(id),
    queryFn: () => fetchGoalNode(id),
    staleTime: GOAL_TREE_STALE_MS,
  });

export const useGoalSearch = (query: string) =>
  useQuery({
    queryKey: goalTreeKeys.search(query),
    queryFn: () => searchGoals(query),
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
    staleTime: GOAL_TREE_STALE_MS,
  });

export const useGoalRoleView = (role: GoalRole) =>
  useQuery({
    queryKey: goalTreeKeys.roleView(role),
    queryFn: () => fetchGoalRoleView(role),
    staleTime: GOAL_TREE_STALE_MS,
  });

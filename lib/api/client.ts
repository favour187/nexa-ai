import type { Goal, Plan, Task, GoalCreateResponse } from "@/types/db";
import type { ReplanResponse } from "@/lib/ai/replan-schema";
import type { CreateGoalInput, UpdateGoalInput } from "@/lib/validation/goals";
import type { UpdateTaskInput } from "@/lib/validation/tasks";

/**
 * Typed browser-side API client used by client components to talk to the
 * Next.js API routes (specs/architecture.md §6).
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error ||
      res.statusText ||
      "Request failed";
    throw new ApiError(res.status, message);
  }

  return body as T;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),
  listGoals: () => request<Goal[]>("/api/goals"),
  createGoal: (input: CreateGoalInput) =>
    request<GoalCreateResponse>("/api/goals", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  getGoal: (id: string) => request<Goal>(`/api/goals/${id}`),
  updateGoal: (id: string, input: UpdateGoalInput) =>
    request<Goal>(`/api/goals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteGoal: (id: string) =>
    request<{ ok: true }>(`/api/goals/${id}`, { method: "DELETE" }),
  acceptPlan: (planId: string) =>
    request<{ plan: Plan }>(`/api/plans/${planId}/accept`, { method: "POST" }),

  // Phase 3 — task status + adaptive replanning
  updateTaskStatus: (taskId: string, input: UpdateTaskInput) =>
    request<{ task: Task }>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  requestReplan: (goalId: string, reason?: string) =>
    request<ReplanResponse>("/api/ai/replan", {
      method: "POST",
      body: JSON.stringify({ goal_id: goalId, reason }),
    }),
  acceptProposal: (proposalId: string) =>
    request<{ ok: boolean }>(`/api/proposals/${proposalId}/accept`, {
      method: "POST",
    }),
  rejectProposal: (proposalId: string) =>
    request<{ ok: boolean }>(`/api/proposals/${proposalId}/reject`, {
      method: "POST",
    }),
};

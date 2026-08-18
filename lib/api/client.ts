import type { Goal } from "@/types/db";
import type { CreateGoalInput, UpdateGoalInput } from "@/lib/validation/goals";

/**
 * Typed browser-side API client used by client components to talk to the
 * Next.js API routes (the "API layer between frontend and backend",
 * specs/architecture.md §6).
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
    request<Goal>("/api/goals", {
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
};

import type {
  Goal,
  Plan,
  Task,
  GoalCreateResponse,
  NotificationSettings,
  Reminder,
  ReminderWithTask,
} from "@/types/db";
import type { ReplanResponse, ReplanChange } from "@/lib/ai/replan-schema";
import type { WhatIfResponse } from "@/lib/ai/whatif-schema";
import type { CreateGoalInput, UpdateGoalInput } from "@/lib/validation/goals";
import type { UpdateTaskInput } from "@/lib/validation/tasks";
import type { CreateReminderInput, UpdateReminderInput } from "@/lib/validation/reminders";
import type { NotificationSettingsInput } from "@/lib/validation/notifications";

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

export interface ReminderRecommendationResponse {
  proposal_id: string;
  remind_at: string;
  rationale: string;
  lead_minutes?: number;
}

export interface WhatIfApplyResult {
  ok: boolean;
  noop?: boolean;
  proposal_id?: string;
  history_entries?: number;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),

  // Goals & plans
  listGoals: () => request<Goal[]>("/api/goals"),
  listTasks: () =>
    request<
      Array<
        Task & {
          milestone: {
            plan: { goal: { id: string; title: string } | null } | null;
          } | null;
        }
      >
    >("/api/tasks"),
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

  // Tasks & adaptive replanning
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

  // Notifications & reminders (Phase 4)
  getNotificationSettings: () =>
    request<NotificationSettings>("/api/notifications/settings"),
  updateNotificationSettings: (input: NotificationSettingsInput) =>
    request<NotificationSettings>("/api/notifications/settings", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  listReminders: (due = false) =>
    request<ReminderWithTask[]>(`/api/reminders${due ? "?due=true" : ""}`),
  createReminder: (input: CreateReminderInput) =>
    request<Reminder>("/api/reminders", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateReminder: (id: string, input: UpdateReminderInput) =>
    request<Reminder>(`/api/reminders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteReminder: (id: string) =>
    request<{ ok: true }>(`/api/reminders/${id}`, { method: "DELETE" }),
  requestReminderRecommendation: (taskId: string) =>
    request<ReminderRecommendationResponse>("/api/ai/reminder-time", {
      method: "POST",
      body: JSON.stringify({ task_id: taskId }),
    }),

  // What-if simulation (Phase 5)
  requestWhatIf: (goalId: string, scenario: string) =>
    request<WhatIfResponse>("/api/ai/what-if", {
      method: "POST",
      body: JSON.stringify({ goal_id: goalId, scenario }),
    }),
  applyWhatIf: async (goalId: string, changes: ReplanChange[], summary?: string) => {
    // Two-step lifecycle (specs/ai.md §6): stage a pending replan proposal,
    // then apply it via the standard proposal accept endpoint. The what-if
    // endpoint itself stays read-only; no create-and-apply shortcut.
    const staged = await request<{ proposal_id: string }>("/api/proposals", {
      method: "POST",
      body: JSON.stringify({ goal_id: goalId, changes, rationale: summary }),
    });
    return request<WhatIfApplyResult>(
      `/api/proposals/${staged.proposal_id}/accept`,
      { method: "POST" },
    );
  },

  // AI mentor / next-action (Phase 6)
  requestNextAction: (availableMinutes?: number, goalId?: string) =>
    request<import("@/lib/ai/next-action-schema").NextActionResponse>(
      "/api/ai/next-action",
      {
        method: "POST",
        body: JSON.stringify({
          available_minutes: availableMinutes,
          goal_id: goalId,
        }),
      },
    ),
  sendMentorMessage: (
    message: string,
    goalId?: string,
    history?: Array<{ role: "user" | "assistant"; content: string }>,
  ) =>
    request<import("@/lib/ai/mentor-schema").MentorReply>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, goal_id: goalId, history }),
    }),

  // Natural-language command bar (Phase C)
  understand: (message: string, goalId?: string) =>
    request<import("@/lib/ai/understand-schema").UnderstandResponse>(
      "/api/ai/understand",
      {
        method: "POST",
        body: JSON.stringify({ message, goal_id: goalId }),
      },
    ),

  // Web Push (Phase D)
  subscribePush: (
    endpoint: string,
    p256dh: string,
    auth: string,
    userAgent?: string,
  ) =>
    request<{ ok: true }>("/api/notifications/push/subscribe", {
      method: "POST",
      body: JSON.stringify({
        endpoint,
        keys: { p256dh, auth },
        user_agent: userAgent,
      }),
    }),
  unsubscribePush: (endpoint: string) =>
    request<{ ok: true }>("/api/notifications/push/subscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    }),
};

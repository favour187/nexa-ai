/**
 * NEXA domain types. Mirror the database schema (migrations 0001–0003) and the
 * conceptual model in specs/product.md §6 / specs/architecture.md §4.
 */

export type Priority = "low" | "medium" | "high";

export type GoalStatus = "active" | "paused" | "completed" | "archived";

export type PlanStatus = "draft" | "active";

export type PlanSource = "generated" | "recovery" | "edited";

export type MilestoneStatus = "todo" | "in_progress" | "done" | "skipped";

// Phase 3: added "postponed".
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "done"
  | "missed"
  | "skipped"
  | "postponed";

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  target_deadline: string | null;
  constraints: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  goal_id: string;
  version: number;
  status: PlanStatus;
  source: PlanSource;
  strategy: string | null;
  rationale: string | null;
  created_at: string;
}

export interface Milestone {
  id: string;
  plan_id: string;
  title: string;
  order_index: number;
  target_date: string | null;
  status: MilestoneStatus;
  created_at: string;
}

export interface Task {
  id: string;
  milestone_id: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  due_at: string | null;
  status: TaskStatus;
  priority: Priority;
  order_index: number;
  status_reason: string | null;
  created_at: string;
  completed_at: string | null;
}

/** A milestone with its nested tasks (used by the plan UI). */
export interface MilestoneWithTasks extends Milestone {
  tasks: Task[];
}

/** Response shape for goal creation (goal + the generated draft plan). */
export interface GoalCreateResponse {
  goal: Goal;
  plan: Pick<
    Plan,
    | "id"
    | "goal_id"
    | "version"
    | "status"
    | "source"
    | "strategy"
    | "rationale"
    | "created_at"
  >;
}

/** A pending/accepted/rejected AI proposal (propose/apply mechanism). */
export interface AiProposal {
  id: string;
  user_id: string;
  goal_id: string;
  kind: "plan" | "recovery" | "next_action" | "reminder_time" | "replan";
  payload: Record<string, unknown>;
  rationale: string | null;
  status: "pending" | "accepted" | "rejected";
  applied_at: string | null;
  created_at: string;
}

/** Transparency / history log entry. */
export interface AiEvent {
  id: string;
  user_id: string;
  goal_id: string;
  type: string;
  summary: string | null;
  rationale: string | null;
  accepted: boolean;
  payload: Record<string, unknown> | null;
  created_at: string;
}

// ---- Phase 4: notifications & reminders -------------------------------------

export interface NotificationChannels {
  in_app?: boolean;
  web_notification?: boolean;
  push?: boolean;
}

export type QuietHours = {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  timezone?: string;
} | null;

export interface NotificationSettings {
  user_id: string;
  enabled: boolean;
  channels: NotificationChannels;
  quiet_hours: QuietHours;
  default_lead_minutes: number;
  allow_ai_suggested_times: boolean;
  push_subscribed: boolean;
  created_at: string;
  updated_at: string;
}

export type ReminderChannel = "in_app" | "web_notification" | "push";

export interface Reminder {
  id: string;
  task_id: string;
  user_id: string;
  remind_at: string;
  delivered: boolean;
  channel: ReminderChannel;
  enabled: boolean;
  lead_minutes: number | null;
  created_at: string;
}

/** A reminder with its task title resolved (for list UI). */
export interface ReminderWithTask extends Reminder {
  task: { id: string; title: string } | null;
}

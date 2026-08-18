/**
 * NEXA domain types.
 *
 * These mirror the database schema in `supabase/migrations/0001_init.sql` and
 * the conceptual model in `specs/product.md` §6 / `specs/architecture.md` §4.
 * Only the Phase 1 entities (users come from Supabase Auth, plus goals, plans,
 * milestones, tasks) are defined here. AI/notification entities are deferred.
 */

export type Priority = "low" | "medium" | "high";

export type GoalStatus = "active" | "paused" | "completed" | "archived";

export type PlanStatus = "draft" | "active";

export type PlanSource = "generated" | "recovery" | "edited";

export type MilestoneStatus = "todo" | "in_progress" | "done" | "skipped";

export type TaskStatus = "todo" | "in_progress" | "done" | "missed" | "skipped";

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  target_deadline: string | null;
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
  created_at: string;
  completed_at: string | null;
}

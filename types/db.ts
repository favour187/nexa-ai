/**
 * NEXA domain types. Mirror the database schema in
 * `supabase/migrations/0001_init.sql` + `0002_ai_planning.sql` and the
 * conceptual model in specs/product.md §6 / specs/architecture.md §4.
 *
 * Phase 2 additions: goals.constraints, plans.strategy/rationale,
 * tasks.order_index.
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
  order_index: number;
  priority: Priority;
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
  plan: Pick<Plan, "id" | "goal_id" | "version" | "status" | "source" | "strategy" | "rationale" | "created_at">;
}

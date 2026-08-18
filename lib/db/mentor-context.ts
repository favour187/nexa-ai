import type { SupabaseClient } from "@supabase/supabase-js";
import { listGoals } from "@/lib/db/goals";
import { listTasksForUser, type TaskWithGoal } from "@/lib/db/tasks";

/**
 * Compact context for the AI mentor / next-action (specs/ai.md §5, architecture
 * §9 "data minimization"). Sends ONLY what the model needs to reason about the
 * next action — never the whole database, never secrets/PII.
 */
export interface MentorContext {
  availableMinutes: number | null;
  goals: Array<{
    id: string;
    title: string;
    target_deadline: string | null;
    priority: string;
    status: string;
  }>;
  incompleteTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due_at: string | null;
    estimated_minutes: number | null;
    goal_id: string | null;
    goal_title: string;
  }>;
  recentCompleted: Array<{ title: string; goal_title: string }>;
  missed: Array<{ title: string; goal_title: string; status: string }>;
  recentReplanCount: number;
}

function goalOf(task: TaskWithGoal): { id: string; title: string } | null {
  return task.milestone?.plan?.goal ?? null;
}

export async function buildMentorContext(
  supabase: SupabaseClient,
  userId: string,
  options: { goalId?: string; availableMinutes?: number | null } = {},
): Promise<MentorContext> {
  const allGoals = await listGoals(supabase, userId);
  const goals = (
    options.goalId
      ? allGoals.filter((g) => g.id === options.goalId)
      : allGoals.filter((g) => g.status === "active")
  ).slice(0, 5);

  const allTasks = await listTasksForUser(supabase);
  const inScope = options.goalId
    ? allTasks.filter((t) => goalOf(t)?.id === options.goalId)
    : allTasks;

  const incomplete = inScope
    .filter((t) => ["todo", "in_progress", "postponed"].includes(t.status))
    .slice(0, 20);
  const missed = inScope
    .filter((t) => ["missed", "skipped"].includes(t.status))
    .slice(0, 10);
  const completed = inScope
    .filter((t) => t.status === "done")
    .slice(-5)
    .reverse();

  let recentReplanCount = 0;
  try {
    const { count } = await supabase
      .from("ai_events")
      .select("id", { count: "exact", head: true })
      .eq("type", "replan");
    recentReplanCount = count ?? 0;
  } catch {
    /* best-effort indicator */
  }

  return {
    availableMinutes: options.availableMinutes ?? null,
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      target_deadline: g.target_deadline,
      priority: g.priority,
      status: g.status,
    })),
    incompleteTasks: incomplete.map((t) => {
      const goal = goalOf(t);
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        due_at: t.due_at,
        estimated_minutes: t.estimated_minutes,
        goal_id: goal?.id ?? null,
        goal_title: goal?.title ?? "Goal",
      };
    }),
    recentCompleted: completed.map((t) => ({
      title: t.title,
      goal_title: goalOf(t)?.title ?? "Goal",
    })),
    missed: missed.map((t) => ({
      title: t.title,
      goal_title: goalOf(t)?.title ?? "Goal",
      status: t.status,
    })),
    recentReplanCount,
  };
}

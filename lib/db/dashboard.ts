import type { SupabaseClient } from "@supabase/supabase-js";
import { listGoals } from "@/lib/db/goals";
import { listTasksForUser } from "@/lib/db/tasks";
import { listReminders } from "@/lib/db/reminders";
import { listMilestonesForGoal } from "@/lib/db/milestones";

/**
 * Dashboard overview aggregation (Phase A — authenticated home).
 *
 * Pure-ish read aggregation over the EXISTING data layer (no new tables, no
 * fabricated data). Every query is RLS-scoped to the authenticated user.
 * Kept separate from the page so it can be unit-tested with a mock client.
 */

export interface DashboardTask {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  estimated_minutes: number | null;
  goal_id: string | null;
  goal_title: string;
}

export interface DashboardGoalSummary {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  target_deadline: string | null;
  done: number;
  total: number;
  milestones: string[];
}

export interface DashboardReminder {
  id: string;
  remind_at: string;
  task_id: string | null;
  task_title: string | null;
}

export interface DashboardData {
  activeGoals: DashboardGoalSummary[];
  todayTasks: DashboardTask[];
  overdueTasks: DashboardTask[];
  upcomingReminders: DashboardReminder[];
}

/** True when `iso` falls on the same LOCAL calendar day as `now`. */
export function isTodayLocal(iso: string | null, now: Date = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** True when `iso` is before the start of the local day of `now`. */
export function isOverdueLocal(iso: string | null, now: Date = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  return d.getTime() < startOfToday.getTime();
}

function goalOf(
  task: Awaited<ReturnType<typeof listTasksForUser>>[number],
): { id: string; title: string } | null {
  return task.milestone?.plan?.goal ?? null;
}

export async function loadDashboardData(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<DashboardData> {
  const goals = await listGoals(supabase, userId);
  const tasks = await listTasksForUser(supabase);
  const reminders = await listReminders(supabase, userId);

  const activeGoals = goals
    .filter((g) => g.status === "active")
    .slice(0, 4);

  const [goalMilestones] = await Promise.all([
    Promise.all(
      activeGoals.map(async (g) => ({
        goalId: g.id,
        milestones: await listMilestonesForGoal(supabase, g.id),
      })),
    ),
  ]);

  const milestoneTitles = new Map<string, string[]>(
    goalMilestones.map(({ goalId, milestones }) => [
      goalId,
      milestones.map((m) => m.title).slice(0, 3),
    ]),
  );

  const perGoalTasks = new Map<string, DashboardGoalSummary>();
  for (const task of tasks) {
    const goal = goalOf(task);
    if (!goal) continue;
    let summary = perGoalTasks.get(goal.id);
    if (!summary) {
      summary = {
        id: goal.id,
        title: goal.title,
        description: null,
        priority: "medium",
        target_deadline: null,
        done: 0,
        total: 0,
        milestones: milestoneTitles.get(goal.id) ?? [],
      };
      perGoalTasks.set(goal.id, summary);
    }
    summary.total += 1;
    if (task.status === "done") summary.done += 1;
  }

  const activeGoalIds = new Set(activeGoals.map((g) => g.id));
  for (const [goalId, summary] of perGoalTasks) {
    if (!activeGoalIds.has(goalId)) continue;
    const goal = activeGoals.find((g) => g.id === goalId);
    if (goal) {
      summary.description = goal.description;
      summary.priority = goal.priority;
      summary.target_deadline = goal.target_deadline;
    }
  }

  const todayTasks: DashboardTask[] = [];
  const overdueTasks: DashboardTask[] = [];
  for (const task of tasks) {
    const goal = goalOf(task);
    if (!["todo", "in_progress", "postponed"].includes(task.status)) continue;
    const entry: DashboardTask = {
      id: task.id,
      title: task.title,
      status: task.status,
      due_at: task.due_at,
      estimated_minutes: task.estimated_minutes,
      goal_id: goal?.id ?? null,
      goal_title: goal?.title ?? "Goal",
    };
    if (isTodayLocal(task.due_at, now)) todayTasks.push(entry);
    else if (isOverdueLocal(task.due_at, now)) overdueTasks.push(entry);
  }
  todayTasks.sort((a, b) => (a.due_at ?? "").localeCompare(b.due_at ?? ""));

  const upcomingReminders = reminders
    .filter(
      (r) => !r.delivered && r.enabled && new Date(r.remind_at).getTime() >= now.getTime(),
    )
    .sort((a, b) => a.remind_at.localeCompare(b.remind_at))
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      remind_at: r.remind_at,
      task_id: r.task_id,
      task_title: r.task?.title ?? null,
    }));

  const activeGoalSummaries = activeGoalIds.size
    ? activeGoals.map((g) => {
        const summary = perGoalTasks.get(g.id);
        return (
          summary ?? {
            id: g.id,
            title: g.title,
            description: g.description,
            priority: g.priority,
            target_deadline: g.target_deadline,
            done: 0,
            total: 0,
            milestones: milestoneTitles.get(g.id) ?? [],
          }
        );
      })
    : [];

  return {
    activeGoals: activeGoalSummaries,
    todayTasks,
    overdueTasks,
    upcomingReminders,
  };
}

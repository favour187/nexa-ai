import Link from "next/link";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { loadDashboardData } from "@/lib/db/dashboard";
import { NextActionCard } from "@/components/mentor/NextActionCard";
import { MentorChat } from "@/components/mentor/MentorChat";
import { NlCommandBar } from "@/components/nl/NlCommandBar";
import { GoalCard } from "@/components/goals/GoalCard";
import { TaskStatusControl } from "@/components/tasks/TaskStatusControl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import type { Goal, TaskStatus } from "@/types/db";

export const dynamic = "force-dynamic";

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function dueTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await tryCreateClient();
  let data;
  let loadError: string | null = null;
  if (!supabase) {
    loadError = "The database is not configured.";
  } else {
    try {
      data = await loadDashboardData(supabase, user.id);
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Failed to load overview";
    }
  }

  const now = new Date();
  const completedToday = data?.todayTasks.filter(
    (t) => t.status === "done",
  ).length ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-600">
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {greeting(now)}, {user.email?.split("@")[0] ?? "friend"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {data
              ? data.activeGoals.length === 0
                ? "No active goals yet — turn one into a plan."
                : `${data.activeGoals.length} active goal${data.activeGoals.length === 1 ? "" : "s"}, ${data.todayTasks.length} task${data.todayTasks.length === 1 ? "" : "s"} due today.`
              : "Here is your execution overview."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/goals/new">
            <Button size="sm">New plan</Button>
          </Link>
          <Link href="/what-if">
            <Button size="sm" variant="secondary">
              What-If
            </Button>
          </Link>
        </div>
      </div>

      {loadError ? (
        <Card className="mt-6 p-4">
          <p className="text-sm text-red-700">{loadError}</p>
        </Card>
      ) : null}

      {/* Natural-language command bar (Phase C/E) */}
      <section className="animate-fade-up-delayed mt-8" aria-labelledby="nl-heading">
        <h2 id="nl-heading" className="sr-only">
          Talk to NEXA
        </h2>
        <NlCommandBar />
      </section>

      {/* Recommended next action */}
      <section className="animate-fade-up-delayed-2 mt-8" aria-labelledby="next-action-heading">
        <h2 id="next-action-heading" className="text-lg font-semibold text-slate-900">
          What should I do now?
        </h2>
        <div className="mt-3">
          <NextActionCard />
        </div>
      </section>

      {/* Today's tasks */}
      <section id="today" className="animate-fade-up-delayed-3 mt-8 scroll-mt-20" aria-labelledby="today-heading">
        <div className="flex items-center justify-between">
          <h2 id="today-heading" className="text-lg font-semibold text-slate-900">
            Today&apos;s tasks
          </h2>
          <span className="text-xs text-slate-500">
            {completedToday} completed
          </span>
        </div>
        <div className="mt-3">
          {data && data.todayTasks.length === 0 && data.overdueTasks.length === 0 ? (
            <EmptyState
              title="Nothing due today"
              description="Enjoy the breathing room — or start the next action above."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {data?.overdueTasks.map((task) => (
                <Card key={task.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-red-600">
                      Overdue · {task.goal_title}
                    </p>
                  </div>
                  <TaskStatusControl taskId={task.id} status={task.status as TaskStatus} />
                </Card>
              ))}
              {data?.todayTasks.map((task) => (
                <Card key={task.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {dueTime(task.due_at)} · {task.goal_title}
                      {task.estimated_minutes ? ` · ${task.estimated_minutes} min` : ""}
                    </p>
                  </div>
                  <TaskStatusControl taskId={task.id} status={task.status as TaskStatus} />
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {/* Active goals */}
        <section aria-labelledby="goals-heading">
          <div className="flex items-center justify-between">
            <h2 id="goals-heading" className="text-lg font-semibold text-slate-900">
              Active goals
            </h2>
            <Link href="/goals" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {data && data.activeGoals.length === 0 ? (
              <EmptyState
                title="No active goals"
                description="Capture a goal in plain language and NEXA will draft the plan."
              >
                <Link href="/goals/new">
                  <Button size="sm">Create your first goal</Button>
                </Link>
              </EmptyState>
            ) : (
              data?.activeGoals.map((goal) => (
                <div key={goal.id}>
                  <GoalCard
                    goal={
                      {
                        id: goal.id,
                        title: goal.title,
                        description: goal.description,
                        priority: goal.priority,
                        status: "active",
                        target_deadline: goal.target_deadline,
                      } as Goal
                    }
                  />
                  <div className="mt-1.5 px-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {goal.done}/{goal.total} tasks done
                      </span>
                      <span>{goal.total ? Math.round((goal.done / goal.total) * 100) : 0}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{
                          width: `${goal.total ? Math.round((goal.done / goal.total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    {goal.milestones.length > 0 ? (
                      <p className="mt-1.5 truncate text-xs text-slate-400">
                        Next milestones: {goal.milestones.join(" → ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Upcoming reminders */}
        <section aria-labelledby="reminders-heading">
          <div className="flex items-center justify-between">
            <h2 id="reminders-heading" className="text-lg font-semibold text-slate-900">
              Upcoming reminders
            </h2>
            <Link href="/reminders" className="text-xs font-medium text-brand-600 hover:underline">
              Manage
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {data && data.upcomingReminders.length === 0 ? (
              <EmptyState
                title="No upcoming reminders"
                description="Remind yourself before a task is due — in-app or via browser notification."
              >
                <Link href="/reminders">
                  <Button size="sm" variant="secondary">
                    Add a reminder
                  </Button>
                </Link>
              </EmptyState>
            ) : (
              data?.upcomingReminders.map((r) => (
                <Card key={r.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {r.task_title ?? "Task reminder"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDate(r.remind_at)} ·{" "}
                      {new Date(r.remind_at).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">scheduled</Badge>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>

      {/* AI Mentor */}
      <section id="mentor" className="mt-8 scroll-mt-20" aria-labelledby="mentor-heading">
        <h2 id="mentor-heading" className="text-lg font-semibold text-slate-900">
          Ask the mentor
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Talk to NEXA about your plan, progress, and what to do next.
        </p>
        <div className="mt-3">
          <MentorChat />
        </div>
      </section>
    </div>
  );
}

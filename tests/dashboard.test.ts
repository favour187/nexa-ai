import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isTodayLocal,
  isOverdueLocal,
  loadDashboardData,
} from "@/lib/db/dashboard";

/**
 * Chainable mock of the Supabase query builder that returns a per-table value.
 * Mirrors the pattern in goals-repository.test.ts but keyed by table so a
 * single client can answer goals / tasks / reminders / plans / milestones.
 */
function mockSupabaseByTable(values: Record<string, unknown>) {
  const chainFor = (value: unknown) =>
    new Proxy({} as Record<string, unknown>, {
      get(_target, prop: string) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) =>
            Promise.resolve(value).then(resolve);
        }
        if (prop === "catch" || prop === "finally") {
          return undefined;
        }
        return () => chainFor(value);
      },
    });
  const client = {
    from: (table: string) => chainFor(values[table] ?? { data: [], error: null }),
  } as unknown as SupabaseClient;
  return client;
}

const FIXED_NOW = new Date(2026, 7, 19, 12, 0, 0); // Wed 2026-08-19 12:00 local

describe("dashboard date helpers", () => {
  it("isTodayLocal matches the same local calendar day", () => {
    expect(isTodayLocal(new Date(2026, 7, 19, 8, 30).toISOString(), FIXED_NOW)).toBe(true);
    expect(isTodayLocal(new Date(2026, 7, 18, 23, 59).toISOString(), FIXED_NOW)).toBe(false);
    expect(isTodayLocal(null, FIXED_NOW)).toBe(false);
  });

  it("isOverdueLocal detects before-start-of-today timestamps", () => {
    expect(isOverdueLocal(new Date(2026, 7, 18, 23, 59).toISOString(), FIXED_NOW)).toBe(true);
    expect(isOverdueLocal(new Date(2026, 7, 19, 0, 0).toISOString(), FIXED_NOW)).toBe(false);
    expect(isOverdueLocal(null, FIXED_NOW)).toBe(false);
  });
});

describe("loadDashboardData", () => {
  const goal = {
    id: "g1",
    title: "Run a half-marathon",
    description: "12 weeks",
    priority: "high",
    status: "active",
    target_deadline: "2026-11-01T00:00:00Z",
  };

  const makeTask = (over: Record<string, unknown>) => ({
    id: "t1",
    title: "Easy 5 km run",
    status: "todo",
    due_at: new Date(2026, 7, 19, 18, 0).toISOString(),
    estimated_minutes: 40,
    priority: "medium",
    milestone: { plan: { goal: { id: "g1", title: goal.title } } },
    ...over,
  });

  it("aggregates goals, today tasks, and upcoming reminders", async () => {
    const client = mockSupabaseByTable({
      goals: { data: [goal], error: null },
      plans: { data: [{ id: "p1" }], error: null },
      milestones: {
        data: [
          { id: "m1", title: "Base building", order_index: 0, target_date: null },
        ],
        error: null,
      },
      tasks: {
        data: [
          makeTask({}),
          makeTask({
            id: "t2",
            title: "Done task",
            status: "done",
            due_at: new Date(2026, 7, 18, 10, 0).toISOString(),
          }),
          makeTask({
            id: "t3",
            title: "Overdue task",
            status: "todo",
            due_at: new Date(2026, 7, 17, 9, 0).toISOString(),
          }),
        ],
        error: null,
      },
      reminder_schedules: {
        data: [
          {
            id: "r1",
            remind_at: new Date(2026, 7, 19, 17, 45).toISOString(),
            delivered: false,
            enabled: true,
            task_id: "t1",
            task: { id: "t1", title: "Easy 5 km run" },
          },
          {
            id: "r2",
            remind_at: new Date(2026, 7, 10, 9, 0).toISOString(),
            delivered: true,
            enabled: true,
            task_id: "t2",
            task: { id: "t2", title: "Done task" },
          },
          {
            id: "r3",
            remind_at: new Date(2026, 7, 19, 16, 0).toISOString(),
            delivered: false,
            enabled: false,
            task_id: "t1",
            task: { id: "t1", title: "Easy 5 km run" },
          },
        ],
        error: null,
      },
    });

    const data = await loadDashboardData(client, "u1", FIXED_NOW);

    expect(data.activeGoals).toHaveLength(1);
    expect(data.activeGoals[0].done).toBe(1);
    expect(data.activeGoals[0].total).toBe(3);
    expect(data.activeGoals[0].milestones).toEqual(["Base building"]);

    expect(data.todayTasks.map((t) => t.id)).toEqual(["t1"]);
    expect(data.overdueTasks.map((t) => t.id)).toEqual(["t3"]);

    // only enabled, undelivered, future reminders
    expect(data.upcomingReminders.map((r) => r.id)).toEqual(["r1"]);
  });

  it("returns empty sections when there is no data", async () => {
    const client = mockSupabaseByTable({});
    const data = await loadDashboardData(client, "u1", FIXED_NOW);
    expect(data.activeGoals).toEqual([]);
    expect(data.todayTasks).toEqual([]);
    expect(data.overdueTasks).toEqual([]);
    expect(data.upcomingReminders).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { buildMentorContext } from "@/lib/db/mentor-context";

/**
 * Branched chainable mock: from(table) resolves a per-table value, simulating
 * the RLS-scoped reads that listGoals / listTasksForUser / ai_events perform.
 */
function mockSupabase(tables: Record<string, unknown>) {
  const chainFor = (value: unknown) => {
    const c = new Proxy({} as Record<string, unknown>, {
      get(_target, prop: string) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) =>
            Promise.resolve(value).then(resolve);
        }
        if (prop === "catch" || prop === "finally") return undefined;
        return () => c;
      },
    });
    return c;
  };
  return {
    from: (table: string) => chainFor(tables[table] ?? { data: [], error: null }),
  } as never;
}

describe("buildMentorContext (compact, data-minimized)", () => {
  it("keeps only active goals, splits tasks by status, and stays compact", async () => {
    const supabase = mockSupabase({
      goals: {
        data: [
          {
            id: "g1",
            title: "Learn React",
            status: "active",
            priority: "high",
            target_deadline: "2099-02-01T00:00:00Z",
          },
          { id: "g2", title: "Old goal", status: "paused", priority: "low", target_deadline: null },
        ],
        error: null,
      },
      tasks: {
        data: [
          {
            id: "t1",
            title: "Hooks",
            status: "todo",
            priority: "high",
            due_at: "2099-01-05T07:00:00Z",
            estimated_minutes: 30,
            milestone: { plan: { goal: { id: "g1", title: "Learn React" } } },
          },
          {
            id: "t2",
            title: "Setup",
            status: "done",
            priority: "low",
            due_at: null,
            estimated_minutes: 10,
            milestone: { plan: { goal: { id: "g1", title: "Learn React" } } },
          },
          {
            id: "t3",
            title: "Missed run",
            status: "missed",
            priority: "medium",
            due_at: "2099-01-01T07:00:00Z",
            estimated_minutes: 40,
            milestone: { plan: { goal: { id: "g1", title: "Learn React" } } },
          },
        ],
        error: null,
      },
      ai_events: { count: 2, error: null },
    });

    const ctx = await buildMentorContext(supabase, "u1", {
      availableMinutes: 30,
    });

    expect(ctx.availableMinutes).toBe(30);
    expect(ctx.goals).toHaveLength(1); // paused goal excluded
    expect(ctx.goals[0].id).toBe("g1");
    expect(ctx.incompleteTasks).toHaveLength(1);
    expect(ctx.incompleteTasks[0]).toMatchObject({
      id: "t1",
      goal_id: "g1",
      goal_title: "Learn React",
    });
    expect(ctx.recentCompleted).toHaveLength(1);
    expect(ctx.missed).toHaveLength(1);
    expect(ctx.recentReplanCount).toBe(2);
  });

  it("scopes to a single goal when goalId is provided", async () => {
    const supabase = mockSupabase({
      goals: { data: [{ id: "g1", title: "React", status: "active", priority: "high", target_deadline: null }], error: null },
      tasks: {
        data: [
          { id: "t1", title: "A", status: "todo", priority: "low", due_at: null, estimated_minutes: 5, milestone: { plan: { goal: { id: "g1", title: "React" } } } },
          { id: "t2", title: "B", status: "todo", priority: "low", due_at: null, estimated_minutes: 5, milestone: { plan: { goal: { id: "g9", title: "Other" } } } },
        ],
        error: null,
      },
      ai_events: { count: 0, error: null },
    });

    const ctx = await buildMentorContext(supabase, "u1", { goalId: "g1" });
    expect(ctx.incompleteTasks).toHaveLength(1);
    expect(ctx.incompleteTasks[0].goal_id).toBe("g1");
  });
});

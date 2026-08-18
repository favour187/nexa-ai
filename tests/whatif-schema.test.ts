import { describe, it, expect } from "vitest";
import { simulationSchema } from "@/lib/ai/whatif-schema";

const TASK_ID = "11111111-1111-1111-1111-111111111111";
const MILESTONE_ID = "33333333-3333-3333-3333-333333333333";

const valid = {
  scenario: "What if I only have 1 hour tomorrow?",
  summary: "Shift the long task later and do a short one tomorrow.",
  feasibility: "on_track",
  deadline_impact: "Still fits the deadline.",
  changes: [
    { type: "reschedule", task_id: TASK_ID, due_at: "2099-01-02T07:00:00Z" },
  ],
  removed_task_ids: [],
  conflicts: [],
  warnings: [],
};

describe("simulationSchema", () => {
  it("accepts a valid simulation", () => {
    expect(simulationSchema.parse(valid).changes).toHaveLength(1);
  });

  it("accepts a no-op simulation with no changes", () => {
    const noop = { ...valid, changes: [] };
    expect(simulationSchema.parse(noop).changes).toEqual([]);
  });

  it("accepts an exceeds_deadline feasibility (deadline conflict)", () => {
    const bad = {
      ...valid,
      feasibility: "exceeds_deadline",
      deadline_impact: "Would finish 2 days after the deadline.",
      warnings: ["Not enough time."],
    };
    expect(simulationSchema.parse(bad).feasibility).toBe("exceeds_deadline");
  });

  it("accepts schedule conflicts and warnings", () => {
    const sim = {
      ...valid,
      conflicts: ["Two tasks overlap on Friday."],
      warnings: ["Heavy load."],
    };
    expect(simulationSchema.parse(sim).conflicts).toHaveLength(1);
  });

  it("rejects a missing summary", () => {
    const bad = { ...valid } as Record<string, unknown>;
    delete bad.summary;
    expect(() => simulationSchema.parse(bad)).toThrow();
  });

  it("rejects an invalid feasibility", () => {
    expect(() => simulationSchema.parse({ ...valid, feasibility: "great" })).toThrow();
  });

  it("rejects a delete change (original plan preserved)", () => {
    const bad = {
      ...valid,
      changes: [{ type: "delete", task_id: TASK_ID }],
    };
    expect(() => simulationSchema.parse(bad)).toThrow();
  });

  it("rejects a goal-deadline change (deadline preserved)", () => {
    const bad = {
      ...valid,
      changes: [{ type: "change_deadline", deadline: "2099-12-31" }],
    };
    expect(() => simulationSchema.parse(bad)).toThrow();
  });

  it("rejects a non-uuid in removed_task_ids", () => {
    expect(() =>
      simulationSchema.parse({ ...valid, removed_task_ids: ["not-a-uuid"] }),
    ).toThrow();
  });
});

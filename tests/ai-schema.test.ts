import { describe, it, expect } from "vitest";
import { aiPlanSchema } from "@/lib/ai/schema";

const validPlan = {
  goal: "Run a half-marathon",
  strategy: "Build an aerobic base, then progressively increase mileage.",
  rationale: "Progressive overload reduces injury risk before race day.",
  feasibility: "on_track",
  milestones: [
    {
      title: "Base building",
      order_index: 0,
      target_date: "2026-09-01",
      tasks: [
        {
          title: "Easy 3 km run",
          description: "Conversational pace",
          estimated_minutes: 30,
          priority: "medium",
          order: 0,
          due_at: "2026-08-20T07:00:00Z",
        },
      ],
    },
  ],
};

describe("aiPlanSchema", () => {
  it("accepts a valid plan", () => {
    expect(aiPlanSchema.parse(validPlan).milestones).toHaveLength(1);
  });

  it("defaults feasibility to on_track", () => {
    const { feasibility: _omit, ...rest } = validPlan;
    expect(aiPlanSchema.parse(rest).feasibility).toBe("on_track");
  });

  it("rejects a plan with no milestones", () => {
    expect(() =>
      aiPlanSchema.parse({ ...validPlan, milestones: [] }),
    ).toThrow();
  });

  it("rejects a milestone with no tasks", () => {
    const bad = JSON.parse(JSON.stringify(validPlan));
    bad.milestones[0].tasks = [];
    expect(() => aiPlanSchema.parse(bad)).toThrow();
  });

  it("rejects an invalid priority", () => {
    const bad = JSON.parse(JSON.stringify(validPlan));
    bad.milestones[0].tasks[0].priority = "urgent";
    expect(() => aiPlanSchema.parse(bad)).toThrow();
  });

  it("rejects non-positive estimated_minutes", () => {
    const bad = JSON.parse(JSON.stringify(validPlan));
    bad.milestones[0].tasks[0].estimated_minutes = 0;
    expect(() => aiPlanSchema.parse(bad)).toThrow();
  });

  it("rejects a bad target_date format", () => {
    const bad = JSON.parse(JSON.stringify(validPlan));
    bad.milestones[0].target_date = "08/20/2026";
    expect(() => aiPlanSchema.parse(bad)).toThrow();
  });

  it("accepts null target_date and absent due_at", () => {
    const p = JSON.parse(JSON.stringify(validPlan));
    p.milestones[0].target_date = null;
    delete p.milestones[0].tasks[0].due_at;
    expect(() => aiPlanSchema.parse(p)).not.toThrow();
  });
});

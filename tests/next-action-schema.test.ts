import { describe, it, expect } from "vitest";
import { recommendationSchema } from "@/lib/ai/next-action-schema";

const TASK_ID = "11111111-1111-1111-1111-111111111111";

const valid = {
  recommended_task_id: TASK_ID,
  recommended_task_title: "Learn React Hooks",
  reason: "Highest priority task that fits your available time.",
  estimated_minutes: 35,
  urgency: "high",
  expected_outcome: "You complete the core hooks module.",
  alternative_task_id: null,
  alternative_task_title: "",
  warnings: [],
};

describe("recommendationSchema", () => {
  it("accepts a valid recommendation", () => {
    expect(recommendationSchema.parse(valid).urgency).toBe("high");
  });

  it("accepts a null task id when there is nothing to recommend", () => {
    const empty = { ...valid, recommended_task_id: null, reason: "No tasks." };
    expect(recommendationSchema.parse(empty).recommended_task_id).toBeNull();
  });

  it("rejects an invalid urgency", () => {
    expect(() =>
      recommendationSchema.parse({ ...valid, urgency: "critical" }),
    ).toThrow();
  });

  it("rejects a missing reason", () => {
    const bad = { ...valid } as Record<string, unknown>;
    delete bad.reason;
    expect(() => recommendationSchema.parse(bad)).toThrow();
  });

  it("rejects a non-uuid recommended_task_id", () => {
    expect(() =>
      recommendationSchema.parse({ ...valid, recommended_task_id: "abc" }),
    ).toThrow();
  });

  it("rejects a non-positive estimated_minutes", () => {
    expect(() =>
      recommendationSchema.parse({ ...valid, estimated_minutes: 0 }),
    ).toThrow();
  });

  it("defaults warnings to an empty array", () => {
    const bad = { ...valid } as Record<string, unknown>;
    delete bad.warnings;
    expect(recommendationSchema.parse(bad).warnings).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { createGoalSchema, updateGoalSchema } from "@/lib/validation/goals";

describe("createGoalSchema", () => {
  it("accepts a minimal title", () => {
    expect(createGoalSchema.parse({ title: "Run a 10k" }).title).toBe("Run a 10k");
  });

  it("defaults priority to medium", () => {
    expect(createGoalSchema.parse({ title: "x" }).priority).toBe("medium");
  });

  it("rejects an empty title", () => {
    expect(() => createGoalSchema.parse({ title: "   " })).toThrow();
  });

  it("rejects an unknown priority", () => {
    expect(() =>
      createGoalSchema.parse({ title: "x", priority: "urgent" }),
    ).toThrow();
  });

  it("accepts an ISO datetime deadline", () => {
    expect(
      createGoalSchema.parse({ title: "x", target_deadline: "2026-12-31T00:00:00Z" })
        .target_deadline,
    ).toBe("2026-12-31T00:00:00Z");
  });

  it("rejects a non-ISO deadline", () => {
    expect(() =>
      createGoalSchema.parse({ title: "x", target_deadline: "next week" }),
    ).toThrow();
  });
});

describe("updateGoalSchema", () => {
  it("accepts a partial update", () => {
    expect(updateGoalSchema.parse({ status: "paused" }).status).toBe("paused");
  });

  it("rejects an empty update", () => {
    expect(() => updateGoalSchema.parse({})).toThrow();
  });
});

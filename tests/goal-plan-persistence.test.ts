import { describe, it, expect, vi } from "vitest";
import {
  buildMilestonesPayload,
  createGoalWithPlan,
} from "@/lib/db/goalPlan";
import type { AiPlan } from "@/lib/ai/schema";

const aiPlan: AiPlan = {
  goal: "Run a half-marathon",
  strategy: "Progressive overload.",
  rationale: "Reduces injury risk.",
  feasibility: "on_track",
  milestones: [
    {
      title: "Base",
      order_index: 0,
      target_date: "2026-09-01",
      tasks: [
        {
          title: "Easy run",
          description: "slow",
          estimated_minutes: 30,
          priority: "medium",
          order: 0,
          due_at: "2026-08-20T07:00:00Z",
        },
      ],
    },
  ],
};

const goalInput = {
  title: "Run a half-marathon",
  description: null,
  priority: "medium",
  target_deadline: null,
  constraints: null,
};

describe("buildMilestonesPayload", () => {
  it("maps the AI plan to the DB payload shape", () => {
    const payload = buildMilestonesPayload(aiPlan);
    expect(payload[0].title).toBe("Base");
    expect(payload[0].tasks[0]).toEqual({
      title: "Easy run",
      description: "slow",
      estimated_minutes: 30,
      due_at: "2026-08-20T07:00:00Z",
      priority: "medium",
      order: 0,
    });
  });
});

describe("createGoalWithPlan", () => {
  it("calls the rpc and returns the created ids", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: { goal_id: "g1", plan_id: "p1" }, error: null });
    const ids = await createGoalWithPlan({ rpc } as never, goalInput, aiPlan);
    expect(ids).toEqual({ goal_id: "g1", plan_id: "p1" });
    expect(rpc).toHaveBeenCalledWith(
      "create_goal_with_plan",
      expect.objectContaining({ p_title: "Run a half-marathon", p_strategy: "Progressive overload." }),
    );
  });

  it("throws when the rpc returns an error (nothing persisted)", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(
      createGoalWithPlan({ rpc } as never, goalInput, aiPlan),
    ).rejects.toEqual({ message: "boom" });
  });

  it("throws when ids are missing", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });
    await expect(
      createGoalWithPlan({ rpc } as never, goalInput, aiPlan),
    ).rejects.toThrow();
  });
});

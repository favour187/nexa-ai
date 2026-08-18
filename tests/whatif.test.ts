import { describe, it, expect } from "vitest";
import { generateSimulation, buildWhatIfResponse } from "@/lib/ai/whatif";
import { simulationSchema, type Simulation } from "@/lib/ai/whatif-schema";
import type { FeatherlessChatClient } from "@/lib/ai/planner";
import type { ReplanContext } from "@/lib/ai/replan-schema";
import {
  AiConfigurationError,
  AiResponseError,
  AiServiceError,
  AiTimeoutError,
} from "@/lib/ai/errors";

const TASK_ID = "11111111-1111-1111-1111-111111111111";
const MILESTONE_ID = "33333333-3333-3333-3333-333333333333";

const context: ReplanContext = {
  goal: { title: "Learn React", targetDeadline: "2099-02-01T00:00:00Z" },
  milestones: [{ id: MILESTONE_ID, title: "Basics", order_index: 0 }],
  tasks: [
    {
      id: TASK_ID,
      milestone_id: MILESTONE_ID,
      title: "Learn React Hooks",
      status: "todo",
      due_at: "2099-01-03T07:00:00Z",
      priority: "medium",
      estimated_minutes: 60,
      order_index: 0,
    },
  ],
};

const validObject = {
  scenario: "What if I only have 1 hour tomorrow?",
  summary: "Do a shorter task tomorrow and push the long one.",
  feasibility: "at_risk",
  deadline_impact: "Would finish about 1 day late.",
  changes: [
    { type: "reschedule", task_id: TASK_ID, due_at: "2099-01-05T07:00:00Z" },
  ],
  removed_task_ids: [TASK_ID],
  conflicts: ["Tight schedule."],
  warnings: ["Busy week."],
};

const validSimulation: Simulation = simulationSchema.parse(validObject);

function clientReturning(content: string | null): FeatherlessChatClient {
  return {
    chat: {
      completions: {
        create: async () => ({ choices: [{ message: { content } }] }),
      },
    },
  };
}
function clientThrowing(error: unknown): FeatherlessChatClient {
  return {
    chat: {
      completions: {
        create: async () => {
          throw error;
        },
      },
    },
  };
}

class APIConnectionTimeoutError extends Error {}

describe("generateSimulation", () => {
  it("returns a validated simulation", async () => {
    const sim = await generateSimulation(context, "x", {
      client: clientReturning(JSON.stringify(validObject)),
    });
    expect(sim.feasibility).toBe("at_risk");
    expect(sim.removed_task_ids).toEqual([TASK_ID]);
  });

  it("accepts a no-op simulation with empty changes", async () => {
    const noop = { ...validObject, changes: [] };
    const sim = await generateSimulation(context, "x", {
      client: clientReturning(JSON.stringify(noop)),
    });
    expect(sim.changes).toEqual([]);
  });

  it("throws AiConfigurationError when not configured and no client", async () => {
    await expect(generateSimulation(context, "x")).rejects.toBeInstanceOf(
      AiConfigurationError,
    );
  });

  it("throws AiResponseError on invalid JSON", async () => {
    await expect(
      generateSimulation(context, "x", {
        client: clientReturning("nope"),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("throws AiResponseError on schema-invalid output", async () => {
    await expect(
      generateSimulation(context, "x", {
        client: clientReturning(JSON.stringify({ scenario: "x" })),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("maps a timeout", async () => {
    await expect(
      generateSimulation(context, "x", {
        client: clientThrowing(new APIConnectionTimeoutError()),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError);
  });

  it("maps a 5xx and does not retry", async () => {
    const error = new Error("boom");
    (error as { status?: number }).status = 503;
    await expect(
      generateSimulation(context, "x", {
        client: clientThrowing(error),
        maxAttempts: 3,
      }),
    ).rejects.toBeInstanceOf(AiServiceError);
  });

  it("never returns fabricated data on repeated failure", async () => {
    await expect(
      generateSimulation(context, "x", {
        client: clientThrowing(new APIConnectionTimeoutError()),
        maxAttempts: 2,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError);
  });
});

describe("buildWhatIfResponse", () => {
  it("builds a current -> proposed diff and resolves removed titles", () => {
    const response = buildWhatIfResponse(validSimulation, context, "g1");
    expect(response.goal_id).toBe("g1");
    expect(response.diff).toHaveLength(1);
    expect(response.diff[0]).toMatchObject({
      task_title: "Learn React Hooks",
      after: "2099-01-05T07:00:00Z",
    });
    expect(response.removed).toEqual([
      { task_id: TASK_ID, title: "Learn React Hooks" },
    ]);
  });

  it("produces an empty diff for a no-op simulation", () => {
    const noop = simulationSchema.parse({ ...validObject, changes: [] });
    const response = buildWhatIfResponse(noop, context, "g1");
    expect(response.diff).toEqual([]);
    expect(response.changes).toEqual([]);
  });
});

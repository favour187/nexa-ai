import { describe, it, expect } from "vitest";
import { generateReplan, buildReplanDiff } from "@/lib/ai/replanner";
import type { FeatherlessChatClient } from "@/lib/ai/planner";
import type { ReplanContext, ReplanProposal } from "@/lib/ai/replan-schema";
import {
  AiConfigurationError,
  AiResponseError,
  AiServiceError,
  AiTimeoutError,
} from "@/lib/ai/errors";

const TASK_ID = "11111111-1111-1111-1111-111111111111";

const validReplanObject = {
  rationale: "Reschedule the missed task and tighten the rest of the week.",
  feasibility: "on_track",
  changes: [
    { type: "reschedule", task_id: TASK_ID, due_at: "2026-09-05T07:00:00Z" },
  ],
};

const context: ReplanContext = {
  goal: { title: "Learn React", targetDeadline: "2026-09-30T00:00:00Z" },
  milestones: [{ id: "m1", title: "Basics", order_index: 0 }],
  tasks: [
    {
      id: TASK_ID,
      milestone_id: "m1",
      title: "Learn React Hooks",
      status: "missed",
      due_at: "2026-08-18T07:00:00Z",
      priority: "medium",
      estimated_minutes: 60,
      order_index: 0,
    },
  ],
};

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

describe("generateReplan", () => {
  it("returns a strictly-validated proposal", async () => {
    const proposal = await generateReplan(context, {
      client: clientReturning(JSON.stringify(validReplanObject)),
    });
    expect(proposal.changes[0].type).toBe("reschedule");
  });

  it("throws AiConfigurationError when not configured and no client", async () => {
    await expect(generateReplan(context)).rejects.toBeInstanceOf(
      AiConfigurationError,
    );
  });

  it("throws AiResponseError on invalid JSON", async () => {
    await expect(
      generateReplan(context, {
        client: clientReturning("not json"),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("throws AiResponseError on schema-invalid output", async () => {
    await expect(
      generateReplan(context, {
        client: clientReturning(JSON.stringify({ rationale: "x" })),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("maps a timeout error", async () => {
    await expect(
      generateReplan(context, {
        client: clientThrowing(new APIConnectionTimeoutError()),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError);
  });

  it("maps a 5xx and does not retry", async () => {
    const error = new Error("boom");
    (error as { status?: number }).status = 503;
    await expect(
      generateReplan(context, {
        client: clientThrowing(error),
        maxAttempts: 3,
      }),
    ).rejects.toBeInstanceOf(AiServiceError);
  });

  it("accepts an at_risk proposal when time is insufficient", async () => {
    const atRisk = JSON.parse(JSON.stringify(validReplanObject));
    atRisk.feasibility = "at_risk";
    const proposal = await generateReplan(context, {
      client: clientReturning(JSON.stringify(atRisk)),
    });
    expect(proposal.feasibility).toBe("at_risk");
  });

  it("never returns fabricated data on repeated failure", async () => {
    await expect(
      generateReplan(context, {
        client: clientThrowing(new APIConnectionTimeoutError()),
        maxAttempts: 2,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError);
  });
});

describe("buildReplanDiff", () => {
  it("builds a current -> proposed diff with before/after", () => {
    const proposal: ReplanProposal = {
      rationale: "r",
      feasibility: "on_track",
      changes: [
        {
          type: "reschedule",
          task_id: TASK_ID,
          due_at: "2026-09-05T07:00:00Z",
        },
      ],
    };
    const [diff] = buildReplanDiff(proposal, context);
    expect(diff.kind).toBe("reschedule");
    expect(diff).toMatchObject({
      task_title: "Learn React Hooks",
      before: "2026-08-18T07:00:00Z",
      after: "2026-09-05T07:00:00Z",
    });
  });
});

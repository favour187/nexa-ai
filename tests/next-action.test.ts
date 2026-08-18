import { describe, it, expect } from "vitest";
import { generateNextAction } from "@/lib/ai/next-action";
import type { FeatherlessChatClient } from "@/lib/ai/planner";
import type { MentorContext } from "@/lib/db/mentor-context";
import {
  AiConfigurationError,
  AiResponseError,
  AiServiceError,
  AiTimeoutError,
} from "@/lib/ai/errors";

const TASK_ID = "11111111-1111-1111-1111-111111111111";

const context: MentorContext = {
  availableMinutes: 30,
  goals: [
    {
      id: "g1",
      title: "Learn React",
      target_deadline: "2099-02-01T00:00:00Z",
      priority: "high",
      status: "active",
    },
  ],
  incompleteTasks: [
    {
      id: TASK_ID,
      title: "Learn React Hooks",
      status: "todo",
      priority: "high",
      due_at: "2099-01-05T07:00:00Z",
      estimated_minutes: 35,
      goal_id: "g1",
      goal_title: "Learn React",
    },
  ],
  recentCompleted: [],
  missed: [],
  recentReplanCount: 0,
};

const validObject = {
  recommended_task_id: TASK_ID,
  recommended_task_title: "Learn React Hooks",
  reason: "Highest priority task; fits a focused session.",
  estimated_minutes: 30,
  urgency: "high",
  expected_outcome: "You finish the hooks module.",
  alternative_task_id: null,
  alternative_task_title: "",
  warnings: [],
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

describe("generateNextAction", () => {
  it("returns a validated recommendation", async () => {
    const rec = await generateNextAction(context, {
      client: clientReturning(JSON.stringify(validObject)),
    });
    expect(rec.recommended_task_id).toBe(TASK_ID);
    expect(rec.urgency).toBe("high");
  });

  it("respects an available-time hint in the context", () => {
    expect(context.availableMinutes).toBe(30);
  });

  it("throws AiConfigurationError when not configured and no client", async () => {
    await expect(generateNextAction(context)).rejects.toBeInstanceOf(
      AiConfigurationError,
    );
  });

  it("throws AiResponseError on invalid JSON", async () => {
    await expect(
      generateNextAction(context, {
        client: clientReturning("nope"),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("throws AiResponseError on schema-invalid output", async () => {
    await expect(
      generateNextAction(context, {
        client: clientReturning(JSON.stringify({ reason: "x" })),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("maps a timeout", async () => {
    await expect(
      generateNextAction(context, {
        client: clientThrowing(new APIConnectionTimeoutError()),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError);
  });

  it("maps a 5xx and does not retry", async () => {
    const error = new Error("boom");
    (error as { status?: number }).status = 503;
    await expect(
      generateNextAction(context, {
        client: clientThrowing(error),
        maxAttempts: 3,
      }),
    ).rejects.toBeInstanceOf(AiServiceError);
  });

  it("never returns fabricated data on repeated failure", async () => {
    await expect(
      generateNextAction(context, {
        client: clientThrowing(new APIConnectionTimeoutError()),
        maxAttempts: 2,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError);
  });
});

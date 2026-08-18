import { describe, it, expect } from "vitest";
import {
  generatePlan,
  type FeatherlessChatClient,
} from "@/lib/ai/planner";
import {
  AiConfigurationError,
  AiNetworkError,
  AiRateLimitError,
  AiResponseError,
  AiServiceError,
  AiTimeoutError,
} from "@/lib/ai/errors";

const validPlanObject = {
  goal: "Run a half-marathon",
  strategy: "Build an aerobic base, then increase mileage.",
  rationale: "Progressive overload reduces injury risk.",
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
class APIConnectionError extends Error {}

const input = { title: "Run a half-marathon" };

describe("generatePlan", () => {
  it("returns a strictly-validated plan", async () => {
    const plan = await generatePlan(input, {
      client: clientReturning(JSON.stringify(validPlanObject)),
    });
    expect(plan.milestones[0].tasks[0].priority).toBe("medium");
  });

  it("throws AiConfigurationError when not configured and no client is injected", async () => {
    await expect(generatePlan(input)).rejects.toBeInstanceOf(
      AiConfigurationError,
    );
  });

  it("throws AiResponseError on invalid JSON", async () => {
    await expect(
      generatePlan(input, {
        client: clientReturning("not json"),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("throws AiResponseError on schema-invalid output", async () => {
    await expect(
      generatePlan(input, {
        client: clientReturning(JSON.stringify({ goal: "x" })),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("throws AiResponseError on empty content", async () => {
    await expect(
      generatePlan(input, { client: clientReturning(null), maxAttempts: 1 }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("maps a timeout error", async () => {
    await expect(
      generatePlan(input, {
        client: clientThrowing(new APIConnectionTimeoutError()),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError);
  });

  it("maps a network error", async () => {
    await expect(
      generatePlan(input, {
        client: clientThrowing(new APIConnectionError()),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiNetworkError);
  });

  it("maps a rate-limit error (not retried)", async () => {
    const error = new Error("rate");
    (error as { status?: number }).status = 429;
    await expect(
      generatePlan(input, { client: clientThrowing(error), maxAttempts: 3 }),
    ).rejects.toBeInstanceOf(AiRateLimitError);
  });

  it("maps a 5xx service error (not retried)", async () => {
    const error = new Error("boom");
    (error as { status?: number }).status = 503;
    await expect(
      generatePlan(input, { client: clientThrowing(error), maxAttempts: 3 }),
    ).rejects.toBeInstanceOf(AiServiceError);
  });

  it("retries once on a transient error, then succeeds", async () => {
    let calls = 0;
    const client: FeatherlessChatClient = {
      chat: {
        completions: {
          create: async () => {
            calls += 1;
            if (calls === 1) throw new APIConnectionError();
            return {
              choices: [{ message: { content: JSON.stringify(validPlanObject) } }],
            };
          },
        },
      },
    };
    const plan = await generatePlan(input, { client, maxAttempts: 2 });
    expect(plan.goal).toBe("Run a half-marathon");
    expect(calls).toBe(2);
  });

  it("never returns fabricated data on repeated failure", async () => {
    await expect(
      generatePlan(input, {
        client: clientThrowing(new APIConnectionTimeoutError()),
        maxAttempts: 2,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError);
  });
});

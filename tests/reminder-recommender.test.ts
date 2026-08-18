import { describe, it, expect } from "vitest";
import { generateReminderRecommendation } from "@/lib/ai/reminder-recommender";
import type { FeatherlessChatClient } from "@/lib/ai/planner";
import type { ReminderContext } from "@/lib/ai/reminder-schema";
import {
  AiConfigurationError,
  AiResponseError,
  AiServiceError,
  AiTimeoutError,
} from "@/lib/ai/errors";

const context: ReminderContext = {
  task: { title: "Learn React Hooks", due_at: "2099-01-02T09:00:00Z", estimated_minutes: 60 },
  goal: { title: "Learn React", target_deadline: "2099-02-01T00:00:00Z", constraints: null },
  defaultLeadMinutes: 15,
  quietHours: null,
  recentMissedCount: 1,
};

const validObject = {
  remind_at: "2099-01-02T08:45:00Z",
  rationale: "A 15-minute lead gives you time to prepare.",
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

describe("generateReminderRecommendation", () => {
  it("returns a validated recommendation", async () => {
    const rec = await generateReminderRecommendation(context, {
      client: clientReturning(JSON.stringify(validObject)),
    });
    expect(rec.remind_at).toBe(validObject.remind_at);
  });

  it("throws AiConfigurationError when not configured and no client", async () => {
    await expect(generateReminderRecommendation(context)).rejects.toBeInstanceOf(
      AiConfigurationError,
    );
  });

  it("throws AiResponseError on invalid JSON", async () => {
    await expect(
      generateReminderRecommendation(context, {
        client: clientReturning("nope"),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("throws AiResponseError on schema-invalid output", async () => {
    await expect(
      generateReminderRecommendation(context, {
        client: clientReturning(JSON.stringify({ rationale: "x" })),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("maps a timeout error", async () => {
    await expect(
      generateReminderRecommendation(context, {
        client: clientThrowing(new APIConnectionTimeoutError()),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError);
  });

  it("maps a 5xx and does not retry", async () => {
    const error = new Error("boom");
    (error as { status?: number }).status = 503;
    await expect(
      generateReminderRecommendation(context, {
        client: clientThrowing(error),
        maxAttempts: 3,
      }),
    ).rejects.toBeInstanceOf(AiServiceError);
  });

  it("never returns fabricated data on repeated failure", async () => {
    await expect(
      generateReminderRecommendation(context, {
        client: clientThrowing(new APIConnectionTimeoutError()),
        maxAttempts: 2,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError);
  });
});

import { describe, it, expect } from "vitest";
import { generateMentorReply } from "@/lib/ai/mentor";
import type { FeatherlessChatClient } from "@/lib/ai/planner";
import type { MentorContext } from "@/lib/db/mentor-context";
import {
  AiConfigurationError,
  AiResponseError,
  AiTimeoutError,
} from "@/lib/ai/errors";

const context: MentorContext = {
  availableMinutes: null,
  goals: [
    {
      id: "g1",
      title: "Learn React",
      target_deadline: "2099-02-01T00:00:00Z",
      priority: "high",
      status: "active",
    },
  ],
  incompleteTasks: [],
  recentCompleted: [{ title: "Setup", goal_title: "Learn React" }],
  missed: [],
  recentReplanCount: 1,
};

const validReply = {
  reply: "You are slightly behind. Focus on the highest-priority task next.",
  references_tasks: [],
  warnings: ["One task was missed recently."],
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

describe("generateMentorReply", () => {
  it("returns a validated, grounded reply", async () => {
    const reply = await generateMentorReply(context, "Am I falling behind?", {
      client: clientReturning(JSON.stringify(validReply)),
    });
    expect(reply.reply).toContain("behind");
    expect(reply.warnings).toHaveLength(1);
  });

  it("throws AiConfigurationError when not configured and no client", async () => {
    await expect(
      generateMentorReply(context, "hi"),
    ).rejects.toBeInstanceOf(AiConfigurationError);
  });

  it("throws AiResponseError on invalid JSON", async () => {
    await expect(
      generateMentorReply(context, "hi", {
        client: clientReturning("nope"),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("throws AiResponseError on schema-invalid output", async () => {
    await expect(
      generateMentorReply(context, "hi", {
        client: clientReturning(JSON.stringify({ text: "x" })),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiResponseError);
  });

  it("maps a timeout", async () => {
    await expect(
      generateMentorReply(context, "hi", {
        client: clientThrowing(new APIConnectionTimeoutError()),
        maxAttempts: 1,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError);
  });

  it("never returns fabricated data on repeated failure", async () => {
    await expect(
      generateMentorReply(context, "hi", {
        client: clientThrowing(new APIConnectionTimeoutError()),
        maxAttempts: 2,
      }),
    ).rejects.toBeInstanceOf(AiTimeoutError);
  });
});

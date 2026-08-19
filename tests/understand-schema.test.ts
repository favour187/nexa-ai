import { describe, it, expect } from "vitest";
import {
  classifyOutputSchema,
  isProposalIntent,
} from "@/lib/ai/understand-schema";

describe("classifyOutputSchema", () => {
  it("accepts a valid classification", () => {
    const parsed = classifyOutputSchema.safeParse({
      intent: "WHAT_IF_SIMULATION",
      goal_id: "11111111-1111-4111-8111-111111111111",
      summary: "Simulate having only one hour tomorrow",
      clarification_question: null,
      scenario: "What if I only have one hour tomorrow?",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.scenario).toContain("one hour");
    }
  });

  it("rejects unknown intents", () => {
    expect(
      classifyOutputSchema.safeParse({
        intent: "DO_EVERYTHING",
        summary: "x",
      }).success,
    ).toBe(false);
  });

  it("rejects a missing summary", () => {
    expect(
      classifyOutputSchema.safeParse({ intent: "QUESTION" }).success,
    ).toBe(false);
  });

  it("allows a clarification question without a scenario", () => {
    const parsed = classifyOutputSchema.safeParse({
      intent: "QUESTION",
      goal_id: null,
      summary: "User asks about the plan",
      clarification_question: "Which goal do you mean?",
      scenario: null,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("isProposalIntent", () => {
  it("flags plan-modifying intents", () => {
    expect(isProposalIntent("REPLAN_REQUEST")).toBe(true);
    expect(isProposalIntent("SCHEDULE_CHANGE")).toBe(true);
    expect(isProposalIntent("TASK_CHANGE")).toBe(true);
  });

  it("does not flag read-only intents", () => {
    expect(isProposalIntent("QUESTION")).toBe(false);
    expect(isProposalIntent("WHAT_IF_SIMULATION")).toBe(false);
    expect(isProposalIntent("NEXT_ACTION")).toBe(false);
    expect(isProposalIntent("MENTOR_ADVICE")).toBe(false);
    expect(isProposalIntent("PROGRESS_ANALYSIS")).toBe(false);
  });
});

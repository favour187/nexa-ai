import { describe, it, expect } from "vitest";
import { replanProposalSchema } from "@/lib/ai/replan-schema";

const TASK_ID = "11111111-1111-1111-1111-111111111111";
const MILESTONE_ID = "33333333-3333-3333-3333-333333333333";

const validProposal = {
  rationale: "Push the missed task later and condense the rest of the week.",
  feasibility: "on_track",
  changes: [
    {
      type: "reschedule",
      task_id: TASK_ID,
      due_at: "2026-09-05T07:00:00Z",
    },
    {
      type: "reprioritize",
      task_id: "22222222-2222-2222-2222-222222222222",
      priority: "high",
    },
    {
      type: "add_task",
      milestone_id: MILESTONE_ID,
      title: "Review notes",
      description: "",
      estimated_minutes: 30,
      due_at: "2026-09-06T07:00:00Z",
      priority: "medium",
      order_index: 2,
    },
  ],
};

describe("replanProposalSchema", () => {
  it("accepts a valid proposal with mixed change types", () => {
    expect(replanProposalSchema.parse(validProposal).changes).toHaveLength(3);
  });

  it("defaults feasibility to on_track", () => {
    const { feasibility: _f, ...rest } = validProposal;
    expect(replanProposalSchema.parse(rest).feasibility).toBe("on_track");
  });

  it("accepts an at_risk feasibility (insufficient remaining time)", () => {
    const p = JSON.parse(JSON.stringify(validProposal));
    p.feasibility = "at_risk";
    expect(replanProposalSchema.parse(p).feasibility).toBe("at_risk");
  });

  it("rejects an empty change set", () => {
    expect(() =>
      replanProposalSchema.parse({ ...validProposal, changes: [] }),
    ).toThrow();
  });

  it("rejects a missing rationale", () => {
    const p = JSON.parse(JSON.stringify(validProposal));
    delete p.rationale;
    expect(() => replanProposalSchema.parse(p)).toThrow();
  });

  it("rejects an invalid priority", () => {
    const p = JSON.parse(JSON.stringify(validProposal));
    p.changes[1].priority = "urgent";
    expect(() => replanProposalSchema.parse(p)).toThrow();
  });

  it("rejects a non-uuid task_id", () => {
    const p = JSON.parse(JSON.stringify(validProposal));
    p.changes[0].task_id = "not-a-uuid";
    expect(() => replanProposalSchema.parse(p)).toThrow();
  });

  it("rejects a 'delete' change (history must be preserved)", () => {
    const p = JSON.parse(JSON.stringify(validProposal));
    p.changes.push({ type: "delete", task_id: TASK_ID });
    expect(() => replanProposalSchema.parse(p)).toThrow();
  });

  it("rejects a goal-deadline change (deadline is preserved)", () => {
    const p = JSON.parse(JSON.stringify(validProposal));
    p.changes.push({ type: "change_deadline", deadline: "2026-12-31" });
    expect(() => replanProposalSchema.parse(p)).toThrow();
  });
});

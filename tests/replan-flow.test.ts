import { describe, it, expect, vi } from "vitest";
import {
  createReplanProposal,
  getProposal,
  rejectProposal,
} from "@/lib/db/proposals";
import { applyReplan } from "@/lib/db/replan";
import { NotFoundError } from "@/lib/db/errors";
import type { ReplanProposal } from "@/lib/ai/replan-schema";

const proposal: ReplanProposal = {
  rationale: "Reschedule the missed task.",
  feasibility: "on_track",
  changes: [
    {
      type: "reschedule",
      task_id: "11111111-1111-1111-1111-111111111111",
      due_at: "2026-09-05T07:00:00Z",
    },
  ],
};

describe("createReplanProposal", () => {
  it("inserts a pending replan proposal scoped to the user", async () => {
    let inserted: Record<string, unknown> | undefined;
    const supabase = {
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          inserted = row;
          return {
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: "p1", status: "pending", kind: "replan" },
                  error: null,
                }),
            }),
          };
        },
      }),
    } as never;

    const saved = await createReplanProposal(supabase, "u1", "g1", proposal);
    expect(saved.id).toBe("p1");
    expect(inserted).toMatchObject({
      user_id: "u1",
      goal_id: "g1",
      kind: "replan",
      status: "pending",
      rationale: "Reschedule the missed task.",
    });
  });
});

describe("getProposal", () => {
  it("returns the proposal when found", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { id: "p1", status: "pending" },
                error: null,
              }),
          }),
        }),
      }),
    } as never;
    expect(((await getProposal(supabase, "p1")) as { id: string }).id).toBe(
      "p1",
    );
  });
});

describe("rejectProposal", () => {
  it("rejects a pending proposal", async () => {
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: "p1", status: "rejected" },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      }),
    } as never;
    const result = await rejectProposal(supabase, "p1");
    expect(result.status).toBe("rejected");
  });

  it("throws NotFound when already handled or not owned", async () => {
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
    } as never;
    await expect(rejectProposal(supabase, "p1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("applyReplan (transactional apply)", () => {
  it("calls the apply_replan rpc with the proposal id", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: true, proposal_id: "p1", history_entries: 1 },
      error: null,
    });
    const result = await applyReplan({ rpc } as never, "p1");
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("apply_replan", { p_proposal_id: "p1" });
  });

  it("propagates rpc errors (nothing applied)", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(applyReplan({ rpc } as never, "p1")).rejects.toEqual({
      message: "boom",
    });
  });
});

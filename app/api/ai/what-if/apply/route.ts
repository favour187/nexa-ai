import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ai/rateLimit";
import { replanChangeSchema } from "@/lib/ai/replan-schema";
import { getGoal } from "@/lib/db/goals";
import { createReplanProposal } from "@/lib/db/proposals";
import { applyReplan } from "@/lib/db/replan";
import {
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
  zodBadRequest,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  goal_id: z.string().uuid(),
  summary: z.string().trim().max(1000).optional(),
  changes: z.array(replanChangeSchema).max(50),
});

/**
 * Apply a what-if simulation as an explicit, user-confirmed plan change.
 *
 * This is NOT a what-if write — the what-if projection is strictly read-only
 * (ai.md §8). Applying reuses the approved REPLAN mechanism: it creates a
 * pending 'replan' ai_proposal from the (re-validated) change set and runs the
 * atomic `apply_replan`, which re-checks ownership of every referenced task and
 * records an ai_event (so the change is traceable to a what-if simulation).
 * Nothing is auto-applied without this explicit request.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  const limit = rateLimit(user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many AI requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  // Ownership: the goal must belong to the caller (RLS-scoped read).
  const goal = await getGoal(supabase, user.id, parsed.data.goal_id);
  if (!goal) return notFound("Goal not found");

  // No-op simulation: nothing to apply.
  if (parsed.data.changes.length === 0) {
    return NextResponse.json({ ok: true, noop: true, history_entries: 0 });
  }

  let proposal;
  try {
    proposal = await createReplanProposal(supabase, user.id, goal.id, {
      rationale: parsed.data.summary
        ? `What-if simulation: ${parsed.data.summary}`
        : "What-if simulation",
      feasibility: "on_track",
      changes: parsed.data.changes,
    });
  } catch {
    return serverError("Could not stage the change.");
  }

  try {
    const result = await applyReplan(supabase, proposal.id);
    return NextResponse.json(result);
  } catch {
    // apply failed; the proposal remains pending and can be retried/rejected.
    return serverError("Could not apply the change. No data was modified.");
  }
}

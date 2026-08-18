import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { replanChangeSchema } from "@/lib/ai/replan-schema";
import { getGoal } from "@/lib/db/goals";
import { createReplanProposal } from "@/lib/db/proposals";
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
  changes: z.array(replanChangeSchema).min(1).max(50),
  rationale: z.string().trim().max(1000).optional(),
});

/**
 * Create a PENDING proposal from a provided, validated change set
 * (specs/architecture.md §6). Used to stage a what-if simulation as a `replan`
 * proposal. This performs NO plan write — the change is applied only when the
 * user accepts it via the standard `POST /api/proposals/:id/accept`.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  const goal = await getGoal(supabase, user.id, parsed.data.goal_id);
  if (!goal) return notFound("Goal not found");

  try {
    const proposal = await createReplanProposal(supabase, user.id, goal.id, {
      rationale: parsed.data.rationale
        ? `What-if simulation: ${parsed.data.rationale}`
        : "What-if simulation",
      feasibility: "on_track",
      changes: parsed.data.changes,
    });
    return NextResponse.json(
      { proposal_id: proposal.id, status: "pending" },
      { status: 201 },
    );
  } catch {
    return serverError("Could not stage the proposal.");
  }
}

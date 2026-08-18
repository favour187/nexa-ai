import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { getProposal } from "@/lib/db/proposals";
import { applyReplan } from "@/lib/db/replan";
import {
  badRequest,
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";

/**
 * Apply a pending proposal (user action — specs/architecture.md §6).
 * Currently only 'replan' proposals are applied; the change set runs in one
 * transaction (apply_replan), so a failure changes nothing.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  const proposal = await getProposal(supabase, params.id);
  if (!proposal) return notFound("Proposal not found");
  if (proposal.status !== "pending") {
    return badRequest("Proposal is no longer pending");
  }
  if (proposal.kind !== "replan") {
    return badRequest("Only replan proposals can be applied at this time");
  }

  try {
    const result = await applyReplan(supabase, params.id);
    return NextResponse.json(result);
  } catch {
    return serverError("Could not apply the proposal. No changes were made.");
  }
}

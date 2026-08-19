import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { getProposal } from "@/lib/db/proposals";
import { applyReplan } from "@/lib/db/replan";
import { applyReminderProposal } from "@/lib/db/reminders";
import { ensureDueReminders } from "@/lib/db/autoReminders";
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
  try {
    if (proposal.kind === "replan") {
      const result = await applyReplan(supabase, params.id);
      try {
        await ensureDueReminders(supabase, user.id);
      } catch {
        /* plan already applied */
      }
      return NextResponse.json(result);
    }
    if (proposal.kind === "reminder_time") {
      const result = await applyReminderProposal(supabase, params.id);
      return NextResponse.json(result);
    }
    return badRequest("This proposal type cannot be applied yet");
  } catch {
    return serverError("Could not apply the proposal. No changes were made.");
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/ai/rateLimit";
import { replanRequestSchema } from "@/lib/validation/replan";
import { fetchReplanContext } from "@/lib/db/replan";
import { generateReplan, buildReplanDiff } from "@/lib/ai/replanner";
import { createReplanProposal } from "@/lib/db/proposals";
import { describeAiError } from "@/lib/ai/errors";
import {
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
  zodBadRequest,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";

/**
 * Propose a revised schedule (specs/architecture.md §6, ai.md §3.4/§6).
 * Generates a PROPOSAL (never applies it). The change set is validated, every
 * referenced id is confirmed to belong to this goal, and the proposal is stored
 * as pending. The user must accept it separately to apply anything.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const limit = rateLimit(user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many AI requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  if (!isAiConfigured) {
    return serviceUnavailable("AI replanning is not configured");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = replanRequestSchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  const fetched = await fetchReplanContext(supabase, parsed.data.goal_id);
  if (!fetched) return notFound("Goal not found");
  const { goal, context } = fetched;
  context.triggerReason = parsed.data.reason ?? null;

  let proposal;
  try {
    proposal = await generateReplan(context);
  } catch (error) {
    const { status, message } = describeAiError(error);
    return NextResponse.json({ error: message }, { status });
  }

  // Defense in depth: the AI may only reference tasks/milestones in this plan.
  const taskIds = new Set(context.tasks.map((t) => t.id));
  const milestoneIds = new Set(context.milestones.map((m) => m.id));
  const referencesUnknown = proposal.changes.some((change) => {
    if (change.type === "add_task") {
      return !milestoneIds.has(change.milestone_id);
    }
    return !taskIds.has(change.task_id);
  });
  if (referencesUnknown) {
    return NextResponse.json(
      { error: "The AI referenced unknown tasks. Please try again." },
      { status: 502 },
    );
  }

  let saved;
  try {
    saved = await createReplanProposal(supabase, user.id, goal.id, proposal);
  } catch {
    return serverError("Could not save the proposal.");
  }

  const diff = buildReplanDiff(proposal, context);
  return NextResponse.json(
    {
      proposal_id: saved.id,
      rationale: proposal.rationale,
      feasibility: proposal.feasibility,
      diff,
    },
    { status: 201 },
  );
}

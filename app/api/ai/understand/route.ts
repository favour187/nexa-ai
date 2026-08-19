import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/ai/rateLimit";
import { buildMentorContext } from "@/lib/db/mentor-context";
import { classifyUserRequest } from "@/lib/ai/understand";
import { isProposalIntent, type UserIntent } from "@/lib/ai/understand-schema";
import { generateNextAction } from "@/lib/ai/next-action";
import { generateMentorReply } from "@/lib/ai/mentor";
import { fetchReplanContext } from "@/lib/db/replan";
import { generateReplan, buildReplanDiff } from "@/lib/ai/replanner";
import { generateSimulation, buildWhatIfResponse } from "@/lib/ai/whatif";
import { createReplanProposal } from "@/lib/db/proposals";
import { describeAiError } from "@/lib/ai/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  notFound,
  serviceUnavailable,
  unauthorized,
  zodBadRequest,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(500),
  goal_id: z.string().uuid().optional(),
});

/**
 * Natural-language command (Phase C/E — specs/product.md F11, ai.md §10).
 *
 * ONE entry point for free-form user messages. The classifier picks an
 * INTERNAL intent, then this route delegates to the appropriate EXISTING
 * capability:
 *
 *   NEXT_ACTION        -> next-action engine (read-only)
 *   WHAT_IF_SIMULATION -> what-if engine (read-only projection)
 *   REPLAN/SCHEDULE/
 *   TASK_CHANGE        -> replan engine -> stored as a PENDING proposal
 *   QUESTION / MENTOR/
 *   PROGRESS_ANALYSIS  -> mentor chat (read-only, grounded)
 *
 * Nothing is ever changed silently: plan modifications always become pending
 * ai_proposals that require explicit user acceptance (ai.md §6).
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

  if (!isAiConfigured) return serviceUnavailable("AI is not configured");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  const message = parsed.data.message;
  const context = await buildMentorContext(supabase, user.id, {
    goalId: parsed.data.goal_id,
  });

  let classification;
  try {
    classification = await classifyUserRequest(context, message);
  } catch (error) {
    const { status, message: msg } = describeAiError(error);
    return NextResponse.json({ error: msg }, { status });
  }

  const intent = classification.intent;
  const goalHint = classification.goal_id ?? parsed.data.goal_id ?? null;

  // 1) Ambiguous -> ask a short clarification question (never guess).
  if (classification.clarification_question) {
    return NextResponse.json({
      kind: "clarify",
      intent,
      question: classification.clarification_question,
    });
  }

  // 2) NEXT_ACTION -> existing next-action engine (read-only).
  if (intent === "NEXT_ACTION") {
    let recommendation;
    try {
      recommendation = await generateNextAction(context);
    } catch (error) {
      const { status, message: msg } = describeAiError(error);
      return NextResponse.json({ error: msg }, { status });
    }
    const knownIds = new Set(context.incompleteTasks.map((t) => t.id));
    const recId = recommendation.recommended_task_id;
    const altId = recommendation.alternative_task_id ?? null;
    if ((recId && !knownIds.has(recId)) || (altId && !knownIds.has(altId))) {
      return NextResponse.json(
        { error: "The AI referenced an unknown task. Please try again." },
        { status: 502 },
      );
    }
    const recTask = recId
      ? context.incompleteTasks.find((t) => t.id === recId)
      : null;
    const goal = recTask?.goal_id
      ? context.goals.find((g) => g.id === recTask.goal_id)
      : null;
    return NextResponse.json({
      kind: "next_action",
      intent,
      goal_id: recTask?.goal_id ?? null,
      goal_title: recTask?.goal_title ?? null,
      goal_deadline: goal?.target_deadline ?? null,
      ...recommendation,
    });
  }

  // 3) WHAT_IF_SIMULATION -> existing read-only what-if engine.
  if (intent === "WHAT_IF_SIMULATION") {
    const resolved = await resolveGoal(supabase, goalHint, context);
    if (!resolved) {
      return NextResponse.json({
        kind: "clarify",
        intent,
        question: "Which goal would you like to explore a what-if for?",
      });
    }
    const fetched = await fetchReplanContext(supabase, resolved.goal_id);
    if (!fetched) return notFound("Goal not found");
    const scenario = classification.scenario ?? message;
    let simulation;
    try {
      simulation = await generateSimulation(fetched.context, scenario);
    } catch (error) {
      const { status, message: msg } = describeAiError(error);
      return NextResponse.json({ error: msg }, { status });
    }
    return NextResponse.json({
      kind: "what_if",
      intent,
      goal_id: resolved.goal_id,
      goal_title: resolved.goal_title,
      response: buildWhatIfResponse(simulation, fetched.context, resolved.goal_id),
    });
  }

  // 4) Plan modifications -> replan engine -> PENDING proposal only.
  if (isProposalIntent(intent)) {
    const resolved = await resolveGoal(supabase, goalHint, context);
    if (!resolved) {
      return NextResponse.json({
        kind: "clarify",
        intent,
        question: "Which goal should I adjust?",
      });
    }
    const fetched = await fetchReplanContext(supabase, resolved.goal_id);
    if (!fetched) return notFound("Goal not found");
    fetched.context.triggerReason = classification.summary;

    let proposal;
    try {
      proposal = await generateReplan(fetched.context);
    } catch (error) {
      const { status, message: msg } = describeAiError(error);
      return NextResponse.json({ error: msg }, { status });
    }

    const diff = buildReplanDiff(proposal, fetched.context);
    const stored = await createReplanProposal(
      supabase,
      user.id,
      resolved.goal_id,
      proposal,
    );

    return NextResponse.json({
      kind: "proposal",
      intent,
      goal_id: resolved.goal_id,
      goal_title: resolved.goal_title,
      proposal_id: stored.id,
      summary: classification.summary,
      rationale: proposal.rationale,
      feasibility: proposal.feasibility,
      diff,
    });
  }

  // 5) Everything else -> existing grounded mentor chat.
  let reply;
  try {
    reply = await generateMentorReply(context, message);
  } catch (error) {
    const { status, message: msg } = describeAiError(error);
    return NextResponse.json({ error: msg }, { status });
  }
  return NextResponse.json({
    kind: "answer",
    intent: intent as UserIntent,
    reply: reply.reply,
    references_tasks: reply.references_tasks,
    warnings: reply.warnings,
  });
}

/** Pick the goal the user means: explicit id first, then the first active one. */
async function resolveGoal(
  supabase: SupabaseClient,
  goalHint: string | null,
  context: Awaited<ReturnType<typeof buildMentorContext>>,
): Promise<{ goal_id: string; goal_title: string } | null> {
  const candidates = [
    goalHint,
    ...context.goals.map((g) => g.id),
  ].filter((id): id is string => Boolean(id));

  for (const id of candidates) {
    // fetchReplanContext is RLS-scoped: returns null for goals the user
    // does not own, so this doubles as an authorization check.
    const fetched = await fetchReplanContext(supabase, id);
    if (fetched) {
      return { goal_id: fetched.goal.id, goal_title: fetched.goal.title };
    }
  }
  return null;
}

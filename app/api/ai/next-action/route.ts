import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/ai/rateLimit";
import { buildMentorContext } from "@/lib/db/mentor-context";
import { generateNextAction } from "@/lib/ai/next-action";
import { describeAiError } from "@/lib/ai/errors";
import type { NextActionResponse } from "@/lib/ai/next-action-schema";
import { serviceUnavailable, unauthorized, zodBadRequest } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    available_minutes: z.number().int().min(1).max(10080).optional(),
    goal_id: z.string().uuid().optional(),
  })
  .optional();

/**
 * "What should I do now?" — read-only recommendation (specs/ai.md §3.5,
 * architecture.md §6). Sends a compact context to Featherless, validates the
 * response, confirms any referenced task belongs to the user, and returns the
 * recommendation. Changes nothing.
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  const context = await buildMentorContext(supabase, user.id, {
    goalId: parsed.data?.goal_id,
    availableMinutes: parsed.data?.available_minutes ?? null,
  });

  let recommendation;
  try {
    recommendation = await generateNextAction(context);
  } catch (error) {
    const { status, message } = describeAiError(error);
    return NextResponse.json({ error: message }, { status });
  }

  // Defense in depth: the AI may only reference the user's own incomplete tasks.
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

  const response: NextActionResponse = {
    ...recommendation,
    goal_id: recTask?.goal_id ?? null,
    goal_title: recTask?.goal_title ?? null,
    goal_deadline: goal?.target_deadline ?? null,
  };
  return NextResponse.json(response);
}

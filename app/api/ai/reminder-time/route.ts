import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/ai/rateLimit";
import { getNotificationSettings } from "@/lib/db/notifications";
import { createReminderProposal } from "@/lib/db/proposals";
import { generateReminderRecommendation } from "@/lib/ai/reminder-recommender";
import { describeAiError } from "@/lib/ai/errors";
import type { ReminderContext } from "@/lib/ai/reminder-schema";
import {
  badRequest,
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
  zodBadRequest,
} from "@/lib/api/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ task_id: z.string().uuid() });

/**
 * Recommend a reminder time for a task (specs/notifications.md §8, ai.md §6).
 * Only available when the user has enabled AI-suggested times. Returns a
 * PROPOSAL (pending) — nothing is created until the user accepts it.
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

  if (!isAiConfigured) {
    return serviceUnavailable("AI is not configured");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  // Gate: AI-suggested times must be enabled by the user.
  const settings = await getNotificationSettings(supabase, user.id);
  if (!settings.allow_ai_suggested_times) {
    return badRequest(
      "AI-suggested reminder times are disabled. Enable them in Settings.",
    );
  }

  // Fetch the task (RLS scopes to the user) and its goal for context.
  const { data: taskRow, error: taskError } = await supabase
    .from("tasks")
    .select(
      "id, title, due_at, estimated_minutes, milestone:milestones(plan:plans(goal:goals(id, title, target_deadline, constraints)))",
    )
    .eq("id", parsed.data.task_id)
    .maybeSingle();
  if (taskError) return serverError("Failed to load the task");
  if (!taskRow) return notFound("Task not found");

  const goal = (
    taskRow as {
      milestone?: { plan?: { goal?: { id: string; title: string; target_deadline: string | null; constraints: string | null } } };
    }
  ).milestone?.plan?.goal;
  if (!goal) return serverError("Could not resolve the task's goal");

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "missed");

  const context: ReminderContext = {
    task: {
      title: taskRow.title,
      due_at: taskRow.due_at,
      estimated_minutes: taskRow.estimated_minutes,
    },
    goal: {
      title: goal.title,
      target_deadline: goal.target_deadline,
      constraints: goal.constraints,
    },
    defaultLeadMinutes: settings.default_lead_minutes,
    quietHours: settings.quiet_hours
      ? { start: settings.quiet_hours.start, end: settings.quiet_hours.end }
      : null,
    recentMissedCount: count ?? 0,
  };

  let recommendation;
  try {
    recommendation = await generateReminderRecommendation(context);
  } catch (error) {
    const { status, message } = describeAiError(error);
    return NextResponse.json({ error: message }, { status });
  }

  // A recommendation in the past is useless — reject (never silently adjust).
  if (new Date(recommendation.remind_at).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "The AI suggested a time in the past. Please try again." },
      { status: 502 },
    );
  }

  let saved;
  try {
    saved = await createReminderProposal(
      supabase,
      user.id,
      goal.id,
      { task_id: parsed.data.task_id, remind_at: recommendation.remind_at },
      recommendation.rationale,
    );
  } catch {
    return serverError("Could not save the recommendation.");
  }

  return NextResponse.json(
    {
      proposal_id: saved.id,
      remind_at: recommendation.remind_at,
      rationale: recommendation.rationale,
      lead_minutes: recommendation.lead_minutes,
    },
    { status: 201 },
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/ai/rateLimit";
import { createGoalSchema } from "@/lib/validation/goals";
import { getGoal, listGoals } from "@/lib/db/goals";
import { getPlan } from "@/lib/db/plans";
import { createGoalWithPlan } from "@/lib/db/goalPlan";
import { ensureDueReminders } from "@/lib/db/autoReminders";
import { generatePlan } from "@/lib/ai/planner";
import { describeAiError } from "@/lib/ai/errors";
import {
  serverError,
  serviceUnavailable,
  unauthorized,
  zodBadRequest,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  try {
    const goals = await listGoals(supabase, user.id);
    return NextResponse.json(goals);
  } catch (error) {
    console.error("[goals] load failed", error);
    return serverError("Failed to load goals");
  }
}









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
    return serviceUnavailable("AI planning is not configured");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);


  let plan;
  try {
    plan = await generatePlan({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      targetDeadline: parsed.data.target_deadline ?? null,
      constraints: parsed.data.constraints ?? null,
    });
  } catch (error) {
    const { status, message } = describeAiError(error);
    return NextResponse.json({ error: message }, { status });
  }


  let created;
  try {
    created = await createGoalWithPlan(
      supabase,
      {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        priority: parsed.data.priority,
        target_deadline: parsed.data.target_deadline ?? null,
        constraints: parsed.data.constraints ?? null,
      },
      plan,
    );
  } catch {
    return serverError("Could not save the plan. No data was changed.");
  }


  try {
    try {
      await ensureDueReminders(supabase, user.id);
    } catch {

    }
    const goal = await getGoal(supabase, user.id, created.goal_id);
    const planRow = await getPlan(supabase, created.plan_id);
    return NextResponse.json({ goal, plan: planRow }, { status: 201 });
  } catch {
    return serverError("Saved, but could not read back the result.");
  }
}

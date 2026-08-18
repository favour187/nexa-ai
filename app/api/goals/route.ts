import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { createGoalSchema } from "@/lib/validation/goals";
import { createGoal, listGoals } from "@/lib/db/goals";
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
    return serverError(
      error instanceof Error ? error.message : "Failed to load goals",
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

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

  try {
    const goal = await createGoal(supabase, user.id, parsed.data);
    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    return serverError(
      error instanceof Error ? error.message : "Failed to create goal",
    );
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { updateGoalSchema } from "@/lib/validation/goals";
import { deleteGoal, getGoal, updateGoal } from "@/lib/db/goals";
import {
  badRequest,
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
  zodBadRequest,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  try {
    const goal = await getGoal(supabase, user.id, params.id);
    if (!goal) return notFound();
    return NextResponse.json(goal);
  } catch (error) {
    return serverError(
      error instanceof Error ? error.message : "Failed to load goal",
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  try {
    const existing = await getGoal(supabase, user.id, params.id);
    if (!existing) return notFound();
    const goal = await updateGoal(supabase, user.id, params.id, parsed.data);
    return NextResponse.json(goal);
  } catch (error) {
    return serverError(
      error instanceof Error ? error.message : "Failed to update goal",
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  try {
    const existing = await getGoal(supabase, user.id, params.id);
    if (!existing) return notFound();
    await deleteGoal(supabase, user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(
      error instanceof Error ? error.message : "Failed to delete goal",
    );
  }
}

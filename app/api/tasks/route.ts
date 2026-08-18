import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { listTasksForUser } from "@/lib/db/tasks";
import { serverError, serviceUnavailable, unauthorized } from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** List the authenticated user's tasks with their goal (specs/architecture.md §6). */
export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  try {
    const tasks = await listTasksForUser(supabase);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[tasks] load failed", error);
    return serverError("Failed to load tasks");
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { updateTaskSchema } from "@/lib/validation/tasks";
import { updateTaskStatus } from "@/lib/db/tasks";
import { NotFoundError } from "@/lib/db/errors";
import {
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
  zodBadRequest,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** Update a task's status (user action — specs/architecture.md §6). */
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  try {
    const task = await updateTaskStatus(supabase, params.id, parsed.data);
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound("Task not found");
    return serverError("Could not update the task");
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { acceptPlan } from "@/lib/db/plans";
import { ensureDueReminders } from "@/lib/db/autoReminders";
import { NotFoundError } from "@/lib/db/errors";
import {
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";





export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  try {
    const plan = await acceptPlan(supabase, params.id);
    try {
      await ensureDueReminders(supabase, user.id);
    } catch {

    }
    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return notFound("Plan not found");
    }
    return serverError("Could not accept the plan");
  }
}

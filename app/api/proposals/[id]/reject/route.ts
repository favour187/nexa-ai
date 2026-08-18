import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { rejectProposal } from "@/lib/db/proposals";
import { NotFoundError } from "@/lib/db/errors";
import {
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";

/** Reject a pending proposal (user action; nothing is applied). */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  try {
    await rejectProposal(supabase, params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return notFound("Proposal not found");
    }
    return serverError("Could not reject the proposal");
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/ai/rateLimit";
import { fetchReplanContext } from "@/lib/db/replan";
import { generateSimulation, buildWhatIfResponse } from "@/lib/ai/whatif";
import { describeAiError } from "@/lib/ai/errors";
import {
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
  zodBadRequest,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  goal_id: z.string().uuid(),
  scenario: z.string().trim().min(1, "Describe a hypothetical scenario").max(500),
});

/**
 * Read-only what-if projection (specs/ai.md §8, architecture.md §6). Generates a
 * VALIDATED simulation and returns a current -> proposed comparison. Performs
 * NO writes — applying happens via /api/ai/what-if/apply (a replan).
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

  const fetched = await fetchReplanContext(supabase, parsed.data.goal_id);
  if (!fetched) return notFound("Goal not found");

  let simulation;
  try {
    simulation = await generateSimulation(
      fetched.context,
      parsed.data.scenario,
    );
  } catch (error) {
    const { status, message } = describeAiError(error);
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json(
    buildWhatIfResponse(simulation, fetched.context, parsed.data.goal_id),
    { status: 200 },
  );
}

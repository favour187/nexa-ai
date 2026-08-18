import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/ai/rateLimit";
import { buildMentorContext } from "@/lib/db/mentor-context";
import { generateMentorReply } from "@/lib/ai/mentor";
import { describeAiError } from "@/lib/ai/errors";
import { serviceUnavailable, unauthorized, zodBadRequest } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(1000),
  goal_id: z.string().uuid().optional(),
});

/**
 * Grounded AI mentor chat (specs/product.md F7, architecture.md §6). Answers are
 * validated and grounded in the user's actual plan data; the model is instructed
 * never to invent progress. Read-only.
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

  const context = await buildMentorContext(supabase, user.id, {
    goalId: parsed.data.goal_id,
  });

  try {
    const reply = await generateMentorReply(context, parsed.data.message);
    return NextResponse.json(reply);
  } catch (error) {
    const { status, message } = describeAiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

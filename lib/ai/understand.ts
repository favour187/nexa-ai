import { env, isAiConfigured } from "@/lib/env";
import {
  classifyOutputSchema,
  type ClassifyOutput,
} from "./understand-schema";
import {
  UNDERSTAND_SYSTEM_PROMPT,
  buildUnderstandUserPrompt,
  UNDERSTAND_PROMPT_VERSION,
} from "./prompts";
import {
  AiConfigurationError,
  AiResponseError,
  AiServiceError,
  mapSdkError,
} from "./errors";
import type { FeatherlessChatClient } from "./planner";
import type { MentorContext } from "@/lib/db/mentor-context";

const DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct";

export interface UnderstandDeps {
  client?: FeatherlessChatClient;
  model?: string;
  maxAttempts?: number;
}

/**
 * Classify a free-form user message into an internal intent (Phase C).
 *
 * Uses the EXISTING Featherless client (one AI system — no duplicate
 * integrations). The classifier is a router only: it never answers, simulates,
 * or proposes changes itself; the /api/ai/understand route executes the
 * matched EXISTING capability. Output is strictly validated; on a malformed
 * response we retry once, then fail safe (no guess).
 */
export async function classifyUserRequest(
  context: MentorContext,
  message: string,
  deps: UnderstandDeps = {},
): Promise<ClassifyOutput> {
  if (!isAiConfigured && !deps.client) {
    throw new AiConfigurationError();
  }

  const maxAttempts = deps.maxAttempts ?? 2;
  const model = deps.model ?? (env.NEXA_FEATHERLESS_MODEL.trim() || DEFAULT_MODEL);

  const getClient = async (): Promise<FeatherlessChatClient> => {
    if (deps.client) return deps.client;
    const { createFeatherlessClient } = await import("./client");
    return createFeatherlessClient() as unknown as FeatherlessChatClient;
  };

  let client: FeatherlessChatClient;
  try {
    client = await getClient();
  } catch (error) {
    throw error instanceof AiConfigurationError
      ? error
      : new AiServiceError("Could not initialize the AI client");
  }

  const userPrompt = buildUnderstandUserPrompt(context, message);
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let raw: string | null | undefined;

    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: UNDERSTAND_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      });
      raw = completion.choices?.[0]?.message?.content ?? null;
    } catch (error) {
      lastError = error;
      const mapped = mapSdkError(error);
      if (mapped instanceof AiServiceError) throw mapped; // non-transient
      if (attempt < maxAttempts) continue;
      throw mapped;
    }

    if (!raw || !raw.trim()) {
      lastError = new AiResponseError(
        `${UNDERSTAND_PROMPT_VERSION}: empty model response`,
      );
      if (attempt < maxAttempts) continue;
      throw lastError;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      lastError = new AiResponseError(
        `${UNDERSTAND_PROMPT_VERSION}: response was not valid JSON`,
      );
      if (attempt < maxAttempts) continue;
      throw lastError;
    }

    const result = classifyOutputSchema.safeParse(parsed);
    if (result.success) return result.data;
    lastError = new AiResponseError(
      `${UNDERSTAND_PROMPT_VERSION}: invalid classifier output`,
      result.error.issues,
    );
    if (attempt < maxAttempts) continue;
    throw lastError;
  }

  throw lastError instanceof Error
    ? lastError
    : new AiServiceError("AI intent classification failed");
}

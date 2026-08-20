import { env, isAiConfigured } from "@/lib/env";
import { recommendationSchema, type Recommendation } from "./next-action-schema";
import {
  NEXT_ACTION_SYSTEM_PROMPT,
  buildNextActionUserPrompt,
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

export interface NextActionDeps {
  client?: FeatherlessChatClient;
  model?: string;
  maxAttempts?: number;
}

/**
 * Generate the single best next action using the EXISTING Featherless client.
 * Output is validated against `recommendationSchema`. Retries once on a
 * transient error, then throws a typed AiError. Never fabricates a task.
 */
export async function generateNextAction(
  context: MentorContext,
  deps: NextActionDeps = {},
): Promise<Recommendation> {
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

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let raw: string | null | undefined;

    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: NEXT_ACTION_SYSTEM_PROMPT },
          { role: "user", content: buildNextActionUserPrompt(context) },
        ],
      });
      raw = completion.choices?.[0]?.message?.content ?? null;
    } catch (error) {
      lastError = error;
      const mapped = mapSdkError(error);
      if (mapped instanceof AiServiceError) throw mapped;
      if (attempt < maxAttempts) continue;
      throw mapped;
    }

    if (!raw) {
      lastError = new AiResponseError("AI returned an empty response");
      if (attempt < maxAttempts) continue;
      throw lastError;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      lastError = new AiResponseError("AI response was not valid JSON");
      if (attempt < maxAttempts) continue;
      throw lastError;
    }

    const result = recommendationSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    lastError = new AiResponseError(
      "AI response failed schema validation",
      result.error.issues,
    );
    if (attempt < maxAttempts) continue;
    throw lastError;
  }

  throw lastError instanceof Error
    ? lastError
    : new AiServiceError("Next-action generation failed");
}

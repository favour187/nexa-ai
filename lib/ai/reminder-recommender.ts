import { env, isAiConfigured } from "@/lib/env";
import {
  reminderRecommendationSchema,
  type ReminderContext,
  type ReminderRecommendation,
} from "./reminder-schema";
import {
  REMINDER_RECOMMENDER_SYSTEM_PROMPT,
  buildReminderUserPrompt,
} from "./prompts";
import {
  AiConfigurationError,
  AiResponseError,
  AiServiceError,
  mapSdkError,
} from "./errors";
import type { FeatherlessChatClient } from "./planner";

const DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct";

export interface ReminderRecommenderDeps {
  client?: FeatherlessChatClient;
  model?: string;
  maxAttempts?: number;
}

/**
 * Generate a recommended reminder time using the EXISTING Featherless client.
 * Output is validated against `reminderRecommendationSchema`. Retries once on a
 * transient error, then throws a typed AiError. Never fabricates a suggestion.
 */
export async function generateReminderRecommendation(
  context: ReminderContext,
  deps: ReminderRecommenderDeps = {},
): Promise<ReminderRecommendation> {
  if (!isAiConfigured && !deps.client) {
    throw new AiConfigurationError();
  }

  const maxAttempts = deps.maxAttempts ?? 2;
  const model =
    deps.model ?? (env.NEXA_FEATHERLESS_MODEL.trim() || DEFAULT_MODEL);

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
          { role: "system", content: REMINDER_RECOMMENDER_SYSTEM_PROMPT },
          { role: "user", content: buildReminderUserPrompt(context) },
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

    const result = reminderRecommendationSchema.safeParse(parsed);
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
    : new AiServiceError("Reminder recommendation failed");
}

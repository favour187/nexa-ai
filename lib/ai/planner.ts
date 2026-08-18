import { env, isAiConfigured } from "@/lib/env";
import { aiPlanSchema, type AiPlan } from "./schema";
import {
  PLANNER_SYSTEM_PROMPT,
  buildPlannerUserPrompt,
} from "./prompts";
import {
  AiConfigurationError,
  AiNetworkError,
  AiRateLimitError,
  AiResponseError,
  AiServiceError,
  AiTimeoutError,
} from "./errors";

const DEFAULT_MODEL = "Qwen/Qwen3-32B";

export interface PlanInput {
  title: string;
  description?: string | null;
  targetDeadline?: string | null;
  constraints?: string | null;
}

/** Minimal chat-completion client shape (matches the OpenAI SDK at runtime). */
export interface FeatherlessChatClient {
  chat: {
    completions: {
      create: (
        body: Record<string, unknown>,
      ) => Promise<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>;
    };
  };
}

export interface PlannerDeps {
  client?: FeatherlessChatClient;
  model?: string;
  maxAttempts?: number;
}

/**
 * Generate a structured execution plan from a goal using Featherless AI.
 *
 * - JSON-mode output is validated against `aiPlanSchema` before being returned.
 * - On invalid/empty/unparseable output or a transient error, retries once,
 *   then throws a typed AiError. NEVER returns fabricated data.
 * - Rate-limit, configuration, and request-level service errors are not retried.
 */
export async function generatePlan(
  input: PlanInput,
  deps: PlannerDeps = {},
): Promise<AiPlan> {
  if (!isAiConfigured && !deps.client) {
    throw new AiConfigurationError();
  }

  const maxAttempts = deps.maxAttempts ?? 2;
  const model = deps.model ?? (env.NEXA_FEATHERLESS_MODEL.trim() || DEFAULT_MODEL);

  // Lazy client creation so this module stays importable in tests without a
  // configured Featherless key and without importing the server-only client.
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
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PLANNER_SYSTEM_PROMPT },
          { role: "user", content: buildPlannerUserPrompt(input) },
        ],
      });
      raw = completion.choices?.[0]?.message?.content ?? null;
    } catch (error) {
      lastError = error;
      const mapped = mapError(error);
      if (
        mapped instanceof AiRateLimitError ||
        mapped instanceof AiServiceError
      ) {
        throw mapped;
      }
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

    const result = aiPlanSchema.safeParse(parsed);
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
    : new AiServiceError("Plan generation failed");
}

/** Map an OpenAI/Featherless SDK error to a typed AiError. */
function mapError(error: unknown): Error {
  const anyError = error as {
    constructor?: { name?: string };
    status?: number;
    message?: string;
  };
  const name = anyError?.constructor?.name ?? "";
  const status = anyError?.status;

  if (name === "APIConnectionTimeoutError") return new AiTimeoutError();
  if (name === "APIConnectionError") {
    return new AiNetworkError(anyError?.message);
  }
  if (name === "RateLimitError" || status === 429) {
    return new AiRateLimitError();
  }
  if (status && status >= 500) {
    return new AiServiceError(`AI service error (${status})`, status);
  }
  if (name === "BadRequestError" || status === 400) {
    return new AiServiceError("AI rejected the request", 400);
  }
  return new AiServiceError(anyError?.message ?? "AI request failed", status);
}

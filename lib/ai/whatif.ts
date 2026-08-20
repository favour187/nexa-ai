import { env, isAiConfigured } from "@/lib/env";
import {
  simulationSchema,
  type Simulation,
  type WhatIfResponse,
} from "./whatif-schema";
import { WHATIF_SYSTEM_PROMPT, buildWhatifUserPrompt } from "./prompts";
import {
  AiConfigurationError,
  AiResponseError,
  AiServiceError,
  mapSdkError,
} from "./errors";
import { buildReplanDiff } from "./replanner";
import type { FeatherlessChatClient } from "./planner";
import type { ReplanContext } from "./replan-schema";

const DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct";

export interface WhatIfDeps {
  client?: FeatherlessChatClient;
  model?: string;
  maxAttempts?: number;
}

/**
 * Generate a READ-ONLY what-if simulation using the EXISTING Featherless client.
 * Output is validated against `simulationSchema`. Retries once on a transient
 * error, then throws a typed AiError. Never fabricates a projection.
 */
export async function generateSimulation(
  context: ReplanContext,
  scenario: string,
  deps: WhatIfDeps = {},
): Promise<Simulation> {
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
        max_tokens: 1000,
        messages: [
          { role: "system", content: WHATIF_SYSTEM_PROMPT },
          { role: "user", content: buildWhatifUserPrompt(context, scenario) },
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

    const result = simulationSchema.safeParse(parsed);
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
    : new AiServiceError("Simulation failed");
}

/** Build a UI-ready response (current -> proposed diff + removed titles). Pure. */
export function buildWhatIfResponse(
  simulation: Simulation,
  context: ReplanContext,
  goalId: string,
): WhatIfResponse {
  const diff = buildReplanDiff(
    {
      rationale: simulation.summary,
      feasibility: "on_track",
      changes: simulation.changes,
    },
    context,
  );

  const taskById = new Map(context.tasks.map((t) => [t.id, t]));
  const removed = simulation.removed_task_ids.map((id) => ({
    task_id: id,
    title: taskById.get(id)?.title ?? "Task",
  }));

  return {
    goal_id: goalId,
    simulation: {
      scenario: simulation.scenario,
      summary: simulation.summary,
      feasibility: simulation.feasibility,
      deadline_impact: simulation.deadline_impact,
      conflicts: simulation.conflicts,
      warnings: simulation.warnings,
    },
    changes: simulation.changes,
    diff,
    removed,
  };
}

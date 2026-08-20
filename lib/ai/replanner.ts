import { env, isAiConfigured } from "@/lib/env";
import {
  replanProposalSchema,
  type ReplanContext,
  type ReplanDiffEntry,
  type ReplanProposal,
} from "./replan-schema";
import { REPLANNER_SYSTEM_PROMPT, buildReplanUserPrompt } from "./prompts";
import {
  AiConfigurationError,
  AiResponseError,
  AiServiceError,
  mapSdkError,
} from "./errors";
import type { FeatherlessChatClient } from "./planner";

const DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct";

export interface ReplannerDeps {
  client?: FeatherlessChatClient;
  model?: string;
  maxAttempts?: number;
}

/**
 * Generate a PROPOSED replan (a change set) using the EXISTING Featherless
 * client — no second AI client. Output is validated against
 * `replanProposalSchema` before being returned. On invalid/empty output or a
 * transient error, retries once, then throws a typed AiError. NEVER fabricates
 * a change set (specs/ai.md §3.4, §6, §9).
 */
export async function generateReplan(
  context: ReplanContext,
  deps: ReplannerDeps = {},
): Promise<ReplanProposal> {
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
        max_tokens: 1000,
        messages: [
          { role: "system", content: REPLANNER_SYSTEM_PROMPT },
          { role: "user", content: buildReplanUserPrompt(context) },
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

    const result = replanProposalSchema.safeParse(parsed);
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
    : new AiServiceError("Replanning failed");
}

/**
 * Build a UI-friendly diff (current -> proposed) from a validated proposal and
 * the current plan context. Pure function — unit testable.
 */
export function buildReplanDiff(
  proposal: ReplanProposal,
  context: ReplanContext,
): ReplanDiffEntry[] {
  const taskById = new Map(context.tasks.map((t) => [t.id, t]));
  const milestoneById = new Map(context.milestones.map((m) => [m.id, m]));

  const diff: ReplanDiffEntry[] = [];
  for (const change of proposal.changes) {
    if (change.type === "reschedule") {
      const task = taskById.get(change.task_id);
      diff.push({
        kind: "reschedule",
        task_id: change.task_id,
        task_title: task?.title ?? "Task",
        before: task?.due_at ?? null,
        after: change.due_at,
      });
    } else if (change.type === "reprioritize") {
      const task = taskById.get(change.task_id);
      diff.push({
        kind: "reprioritize",
        task_id: change.task_id,
        task_title: task?.title ?? "Task",
        before: task?.priority ?? "medium",
        after: change.priority,
      });
    } else {
      const milestone = milestoneById.get(change.milestone_id);
      diff.push({
        kind: "add_task",
        milestone_title: milestone?.title ?? "Milestone",
        title: change.title,
        due_at: change.due_at ?? null,
      });
    }
  }
  return diff;
}

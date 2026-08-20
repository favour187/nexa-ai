import "server-only";
import OpenAI from "openai";
import { env, isAiConfigured } from "@/lib/env";
import { AiConfigurationError } from "./errors";

/**
 * Featherless AI client (OpenAI-compatible). SERVER-ONLY. The API key is read
 * from an environment variable and never reaches the browser or the repo.
 *
 * Per specs/architecture.md §7: baseURL https://api.featherless.ai/v1, a single
 * configurable primary model id (Qwen3-class default), JSON-mode structured
 * output.
 */

export const FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1";
export const DEFAULT_FEATHERLESS_MODEL = "Qwen/Qwen2.5-7B-Instruct";
export const FEATHERLESS_TIMEOUT_MS = 30_000;

export function getFeatherlessModel(): string {
  return env.NEXA_FEATHERLESS_MODEL.trim() || DEFAULT_FEATHERLESS_MODEL;
}

export function createFeatherlessClient(): OpenAI {
  if (!isAiConfigured) {
    throw new AiConfigurationError();
  }
  return new OpenAI({
    apiKey: env.FEATHERLESS_API_KEY,
    baseURL: FEATHERLESS_BASE_URL,
    timeout: FEATHERLESS_TIMEOUT_MS,
    maxRetries: 0, // retries are handled explicitly in the planner
  });
}

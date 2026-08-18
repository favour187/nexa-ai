import { z } from "zod";

/**
 * Strict schema for the AI-generated plan. The Featherless response is parsed
 * as JSON and MUST validate against this before it is allowed anywhere near the
 * database (specs/ai.md §4, §9; architecture.md §7). Invalid output is rejected
 * — never loosely parsed, never replaced with fake data.
 */

export const planPriorityEnum = z.enum(["low", "medium", "high"]);
export const planFeasibilityEnum = z.enum(["on_track", "at_risk"]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "target_date must be YYYY-MM-DD");

export const aiTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).default(""),
  estimated_minutes: z.number().int().positive().max(100000),
  priority: planPriorityEnum,
  order: z.number().int().min(0),
  due_at: z.string().datetime().nullable().optional(),
});

export const aiMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  order_index: z.number().int().min(0),
  target_date: isoDate.nullable().optional(),
  tasks: z.array(aiTaskSchema).min(1, "a milestone needs at least one task"),
});

export const aiPlanSchema = z.object({
  goal: z.string().min(1).max(300),
  strategy: z.string().min(1).max(2000),
  rationale: z.string().min(1).max(2000),
  feasibility: planFeasibilityEnum.default("on_track"),
  milestones: z.array(aiMilestoneSchema).min(1).max(20),
});

export type AiTask = z.infer<typeof aiTaskSchema>;
export type AiMilestone = z.infer<typeof aiMilestoneSchema>;
export type AiPlan = z.infer<typeof aiPlanSchema>;

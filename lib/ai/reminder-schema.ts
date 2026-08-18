import { z } from "zod";

/**
 * Strict schema for the AI reminder-time recommendation (specs/notifications.md
 * §8, specs/ai.md §6). The recommendation is a PROPOSAL the user accepts — never
 * applied automatically.
 */

export const reminderRecommendationSchema = z.object({
  remind_at: z.string().datetime(),
  rationale: z.string().min(1).max(1000),
  lead_minutes: z.number().int().min(0).max(10080).optional(),
});

export type ReminderRecommendation = z.infer<typeof reminderRecommendationSchema>;

/** Context sent to the model — scoped to one task/goal, no secrets/PII. */
export interface ReminderContext {
  task: {
    title: string;
    due_at: string | null;
    estimated_minutes: number | null;
  };
  goal: {
    title: string;
    target_deadline: string | null;
    constraints: string | null;
  };
  defaultLeadMinutes: number;
  quietHours: { start: string; end: string } | null;
  recentMissedCount: number;
}

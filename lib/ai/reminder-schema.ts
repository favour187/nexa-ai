import { z } from "zod";







export const reminderRecommendationSchema = z.object({
  remind_at: z.string().datetime(),
  rationale: z.string().min(1).max(1000),
  lead_minutes: z.number().int().min(0).max(10080).optional(),
});

export type ReminderRecommendation = z.infer<typeof reminderRecommendationSchema>;


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

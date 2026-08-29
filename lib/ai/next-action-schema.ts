import { z } from "zod";







export const recommendationSchema = z.object({
  recommended_task_id: z.string().uuid().nullable(),
  recommended_task_title: z.string().min(1).max(200),
  reason: z.string().min(1).max(1000),
  estimated_minutes: z.number().int().positive().max(100000).nullable(),
  urgency: z.enum(["low", "medium", "high"]),
  expected_outcome: z.string().min(1).max(500),
  alternative_task_id: z.string().uuid().nullable().optional(),
  alternative_task_title: z.string().max(200).optional(),
  warnings: z.array(z.string()).max(10).default([]),
});

export type Recommendation = z.infer<typeof recommendationSchema>;


export type NextActionResponse = Recommendation & {
  goal_id: string | null;
  goal_title: string | null;
  goal_deadline: string | null;
};

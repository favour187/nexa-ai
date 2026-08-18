import { z } from "zod";

/** Request body for POST /api/ai/replan (specs/architecture.md §6). */
export const replanRequestSchema = z.object({
  goal_id: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export type ReplanRequest = z.infer<typeof replanRequestSchema>;

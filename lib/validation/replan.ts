import { z } from "zod";


export const replanRequestSchema = z.object({
  goal_id: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export type ReplanRequest = z.infer<typeof replanRequestSchema>;

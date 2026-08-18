import { z } from "zod";

/**
 * Request validation schemas. These enforce the shape of user-supplied input at
 * the API boundary (specs/architecture.md §6). They are USER-driven inputs only;
 * they are intentionally not used by any AI code path in this phase.
 */

export const priorityEnum = z.enum(["low", "medium", "high"]);

export const goalStatusEnum = z.enum(["active", "paused", "completed", "archived"]);

export const createGoalSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  priority: priorityEnum.default("medium"),
  target_deadline: z.string().datetime().optional().nullable(),
});

export const updateGoalSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    priority: priorityEnum.optional(),
    target_deadline: z.string().datetime().optional().nullable(),
    status: goalStatusEnum.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "At least one field must be provided",
  });

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

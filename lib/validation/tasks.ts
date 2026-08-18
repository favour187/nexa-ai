import { z } from "zod";

/**
 * Validation for task status updates (specs/architecture.md §6:
 * `PATCH /api/tasks/:id` is a user action). Phase 3 adds "postponed".
 */
export const taskStatusEnum = z.enum([
  "todo",
  "in_progress",
  "done",
  "missed",
  "skipped",
  "postponed",
]);

export const updateTaskSchema = z.object({
  status: taskStatusEnum,
  reason: z.string().trim().max(500).optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

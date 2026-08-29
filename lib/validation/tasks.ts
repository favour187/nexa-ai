import { z } from "zod";





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

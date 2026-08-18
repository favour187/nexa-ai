import { z } from "zod";

/** Reminder request validation (specs/notifications.md §5). */

const channelEnum = z.enum(["in_app", "web_notification", "push"]);

// A new reminder must target a valid future point in time.
const futureDatetime = z
  .string()
  .datetime()
  .refine((value) => new Date(value).getTime() > Date.now() - 60_000, {
    message: "remind_at must be a valid future date and time",
  });

export const createReminderSchema = z.object({
  task_id: z.string().uuid(),
  remind_at: futureDatetime,
  lead_minutes: z.number().int().min(0).max(10080).optional(),
  channel: channelEnum.optional(),
});

export const updateReminderSchema = z
  .object({
    remind_at: z.string().datetime().optional(),
    enabled: z.boolean().optional(),
    delivered: z.boolean().optional(),
    lead_minutes: z.number().int().min(0).max(10080).nullable().optional(),
    channel: channelEnum.optional(),
  })
  .refine((value) => Object.values(value).some((x) => x !== undefined), {
    message: "At least one field must be provided",
  });

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;

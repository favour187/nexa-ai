import { z } from "zod";

/** Notification settings validation (specs/notifications.md §7). */

const timeOfDay = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM");

export const quietHoursSchema = z
  .object({
    start: timeOfDay,
    end: timeOfDay,
    timezone: z.string().max(100).optional(),
  })
  .nullable();

export const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  channels: z.record(z.string(), z.boolean()).optional(),
  quiet_hours: quietHoursSchema.optional(),
  default_lead_minutes: z.number().int().min(0).max(10080),
  allow_ai_suggested_times: z.boolean(),
  push_subscribed: z.boolean().optional(),
});

export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;

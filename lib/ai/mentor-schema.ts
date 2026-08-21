import { z } from "zod";

/**
 * Strict schema for an AI mentor reply (specs/product.md F7). The mentor is
 * grounded in the user's actual plan data and may never invent progress or
 * claim an action happened.
 */
export const mentorReplySchema = z.object({
  reply: z.string().min(1).max(4000),
  references_tasks: z.array(z.string().max(200)).max(10).default([]),
  warnings: z.array(z.string()).max(10).default([]),
});

export type MentorReply = z.infer<typeof mentorReplySchema>;

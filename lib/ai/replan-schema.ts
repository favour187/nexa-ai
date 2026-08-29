import { z } from "zod";









const priority = z.enum(["low", "medium", "high"]);

const rescheduleChange = z.object({
  type: z.literal("reschedule"),
  task_id: z.string().uuid(),
  due_at: z.string().datetime().nullable(),
});

const reprioritizeChange = z.object({
  type: z.literal("reprioritize"),
  task_id: z.string().uuid(),
  priority,
});

const addTaskChange = z.object({
  type: z.literal("add_task"),
  milestone_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).default(""),
  estimated_minutes: z.number().int().positive().optional(),
  due_at: z.string().datetime().nullable().optional(),
  priority: priority.optional(),
  order_index: z.number().int().min(0).optional(),
});

export const replanChangeSchema = z.discriminatedUnion("type", [
  rescheduleChange,
  reprioritizeChange,
  addTaskChange,
]);

export const replanProposalSchema = z.object({
  rationale: z.string().min(1).max(2000),
  feasibility: z.enum(["on_track", "at_risk"]).default("on_track"),
  changes: z.array(replanChangeSchema).min(1).max(50),
});

export type ReplanChange = z.infer<typeof replanChangeSchema>;
export type ReplanProposal = z.infer<typeof replanProposalSchema>;


export interface ReplanContext {
  goal: {
    title: string;
    description?: string | null;
    targetDeadline?: string | null;
    constraints?: string | null;
  };
  strategy?: string | null;
  milestones: Array<{
    id: string;
    title: string;
    order_index: number;
    target_date?: string | null;
  }>;
  tasks: Array<{
    id: string;
    milestone_id: string;
    title: string;
    status: string;
    due_at?: string | null;
    priority?: string | null;
    estimated_minutes?: number | null;
    order_index?: number;
  }>;
  triggerReason?: string | null;
}


export type ReplanDiffEntry =
  | {
      kind: "reschedule";
      task_id: string;
      task_title: string;
      before: string | null;
      after: string | null;
    }
  | {
      kind: "reprioritize";
      task_id: string;
      task_title: string;
      before: string;
      after: string;
    }
  | {
      kind: "add_task";
      milestone_title: string;
      title: string;
      due_at: string | null;
    };

export interface ReplanResponse {
  proposal_id: string;
  rationale: string;
  feasibility: "on_track" | "at_risk";
  diff: ReplanDiffEntry[];
}

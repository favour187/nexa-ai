import { z } from "zod";








export const USER_INTENTS = [
  "QUESTION",
  "WHAT_IF_SIMULATION",
  "REPLAN_REQUEST",
  "SCHEDULE_CHANGE",
  "PROGRESS_ANALYSIS",
  "NEXT_ACTION",
  "MENTOR_ADVICE",
  "TASK_CHANGE",
] as const;

export type UserIntent = (typeof USER_INTENTS)[number];






export const classifyOutputSchema = z.object({
  intent: z.enum(USER_INTENTS),
  goal_id: z.string().uuid().nullable().optional(),
  summary: z.string().min(1).max(300),
  clarification_question: z.string().max(300).nullable().optional(),
  scenario: z.string().max(500).nullable().optional(),
});

export type ClassifyOutput = z.infer<typeof classifyOutputSchema>;


export const PROPOSAL_INTENTS = [
  "REPLAN_REQUEST",
  "SCHEDULE_CHANGE",
  "TASK_CHANGE",
] as const satisfies readonly UserIntent[];

export function isProposalIntent(intent: UserIntent): boolean {
  return (PROPOSAL_INTENTS as readonly string[]).includes(intent);
}

import type { WhatIfResponse } from "./whatif-schema";
import type { ReplanDiffEntry } from "./replan-schema";






export type UnderstandResponse =
  | {
      kind: "clarify";
      intent: UserIntent;
      question: string;
    }
  | {
      kind: "answer";
      intent: UserIntent;
      reply: string;
      references_tasks: string[];
      warnings: string[];
    }
  | {
      kind: "next_action";
      intent: "NEXT_ACTION";
      goal_id: string | null;
      goal_title: string | null;
      goal_deadline: string | null;
      recommended_task_id: string | null;
      recommended_task_title: string;
      reason: string;
      estimated_minutes: number | null;
      urgency: "low" | "medium" | "high";
      expected_outcome: string;
      alternative_task_id?: string | null;
      alternative_task_title?: string;
      warnings: string[];
    }
  | {
      kind: "what_if";
      intent: "WHAT_IF_SIMULATION";
      goal_id: string;
      goal_title: string;
      response: WhatIfResponse;
    }
  | {
      kind: "proposal";
      intent: UserIntent;
      goal_id: string;
      goal_title: string;
      proposal_id: string;
      summary: string;
      rationale: string;
      feasibility: "on_track" | "at_risk";
      diff: ReplanDiffEntry[];
    };

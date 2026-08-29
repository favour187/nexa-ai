import { z } from "zod";
import { replanChangeSchema, type ReplanChange, type ReplanDiffEntry } from "./replan-schema";









export const simulationSchema = z.object({
  scenario: z.string().min(1).max(500),
  summary: z.string().min(1).max(2000),
  feasibility: z.enum(["on_track", "at_risk", "exceeds_deadline"]),
  deadline_impact: z.string().min(1).max(500),
  changes: z.array(replanChangeSchema).max(50),
  removed_task_ids: z.array(z.string().uuid()).max(50),
  conflicts: z.array(z.string()).max(20),
  warnings: z.array(z.string()).max(20),
});

export type Simulation = z.infer<typeof simulationSchema>;

export interface WhatIfResponse {
  goal_id: string;
  simulation: Pick<
    Simulation,
    "scenario" | "summary" | "feasibility" | "deadline_impact" | "conflicts" | "warnings"
  >;
  changes: ReplanChange[];
  diff: ReplanDiffEntry[];
  removed: { task_id: string; title: string }[];
}

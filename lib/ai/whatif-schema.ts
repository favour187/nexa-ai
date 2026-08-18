import { z } from "zod";
import { replanChangeSchema, type ReplanChange, type ReplanDiffEntry } from "./replan-schema";

/**
 * Strict schema for a what-if simulation (specs/ai.md §8). The simulation is a
 * READ-ONLY projection — it is never written to the plan. `changes` reuse the
 * Phase 3 replan change set (reschedule / reprioritize / add_task) so an
 * optional APPLY can go through the replan proposal mechanism. `changes` may be
 * empty (a no-op scenario). `removed_task_ids` are display-only suggestions
 * (never auto-deleted — ai.md §6 forbids deleting user data).
 */
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
  changes: ReplanChange[]; // raw change set (used only if the user applies)
  diff: ReplanDiffEntry[]; // UI-friendly current -> proposed
  removed: { task_id: string; title: string }[];
}

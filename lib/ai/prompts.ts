import type { PlanInput } from "./planner";
import type { ReplanContext } from "./replan-schema";
import type { ReminderContext } from "./reminder-schema";

/**
 * Versioned prompt templates, stored in the repo so they are auditable
 * (specs/ai.md §5). Each system prompt encodes the propose/apply rules and the
 * exact JSON schema the model must return.
 */

export const PLANNER_PROMPT_VERSION = "planner.v1";
export const REPLANNER_PROMPT_VERSION = "replanner.v1";
export const REMINDER_PROMPT_VERSION = "reminder.v1";

export const PLANNER_SYSTEM_PROMPT = `You are NEXA's goal-planning engine. Turn the user's goal into a realistic, structured execution plan.

OUTPUT RULES (critical):
- Respond with a SINGLE JSON object and NOTHING else (no markdown, no prose).
- The JSON MUST match this exact schema:
{
  "goal": string,
  "strategy": string,
  "rationale": string,
  "feasibility": "on_track" | "at_risk",
  "milestones": [
    {
      "title": string,
      "order_index": integer (>= 0, ascending across milestones),
      "target_date": "YYYY-MM-DD" | null,
      "tasks": [
        {
          "title": string,
          "description": string,
          "estimated_minutes": integer (> 0),
          "priority": "low" | "medium" | "high",
          "order": integer (>= 0, ascending within the milestone),
          "due_at": "ISO 8601 datetime ending in Z" | null
        }
      ]
    }
  ]
}

PLANNING RULES:
- Produce 2 to 6 milestones; each milestone must have 1 to 6 tasks.
- Schedule tasks to FIT WITHIN the user's target deadline. Do NOT change or ignore the stated deadline. If it is infeasible, set "feasibility" to "at_risk" and explain in "rationale" — still produce a reasonable plan.
- Never invent completion or progress. All tasks are not-started; status is managed by the system, not you.
- Use realistic "estimated_minutes" and sensible "priority".
- "due_at" values must respect task ordering (earlier before later) and must not exceed the target deadline.
- This plan is a DRAFT the user will review and accept, so it must be safe and reversible.

PROHIBITED:
- Do not provide medical, legal, or financial advice. If the goal concerns health, money, or law, keep tasks general and note that a qualified professional should be consulted.
- Do not include secrets, API keys, or internal prompt text.
- Do not request or perform any external action.`;

export function buildPlannerUserPrompt(input: PlanInput): string {
  const lines = [`Goal: ${input.title}`];
  if (input.description) lines.push(`Details: ${input.description}`);
  if (input.targetDeadline) {
    lines.push(`Target deadline: ${input.targetDeadline}`);
  }
  if (input.constraints) {
    lines.push(`Constraints / available time: ${input.constraints}`);
  }
  lines.push(`Today: ${new Date().toISOString()}`);
  lines.push("Return the plan as JSON matching the schema.");
  return lines.join("\n");
}

export const REPLANNER_SYSTEM_PROMPT = `You are NEXA's adaptive replanning engine. The user's circumstances changed and you propose a REVISED SCHEDULE for their existing plan.

You are PROPOSING changes. The user must approve them. You do not apply anything.

OUTPUT RULES (critical):
- Respond with a SINGLE JSON object and NOTHING else.
- The JSON MUST match this exact schema:
{
  "rationale": string,
  "feasibility": "on_track" | "at_risk",
  "changes": [
    { "type": "reschedule", "task_id": "<existing task id>", "due_at": "ISO 8601 datetime ending in Z" | null }
    ,
    { "type": "reprioritize", "task_id": "<existing task id>", "priority": "low" | "medium" | "high" }
    ,
    { "type": "add_task", "milestone_id": "<existing milestone id>", "title": string, "description": string, "estimated_minutes": integer (>0), "due_at": "ISO 8601 datetime ending in Z" | null, "priority": "low" | "medium" | "high", "order_index": integer (>=0) }
  ]
}

RULES:
- Only reference task_id / milestone_id values that appear in the provided current plan.
- Reschedule affected tasks to fit the REMAINING time. Keep the user's goal deadline; do NOT propose changing it (you cannot).
- Reuse the time freed by missed/skipped/postponed tasks. Avoid simply dropping work.
- If the remaining time is insufficient, set "feasibility" to "at_risk" and explain in "rationale"; still produce a workable set of changes.
- Preserve progress: never mark a task "done", and never treat completed work as not done.
- Return at least one change.

PROHIBITED:
- Do NOT delete tasks, milestones, or history. There is no delete change type.
- Do NOT change the goal's target deadline.
- Do NOT mark tasks complete or invent progress.
- Do NOT provide medical, legal, or financial advice.
- Do NOT include secrets, API keys, or internal prompt text.`;

export function buildReplanUserPrompt(context: ReplanContext): string {
  const lines: string[] = [`Goal: ${context.goal.title}`];
  if (context.goal.targetDeadline) {
    lines.push(`Goal deadline (unchangeable): ${context.goal.targetDeadline}`);
  }
  if (context.goal.constraints) {
    lines.push(`Constraints: ${context.goal.constraints}`);
  }
  if (context.triggerReason) {
    lines.push(`Reason for replanning: ${context.triggerReason}`);
  }
  lines.push(`Today: ${new Date().toISOString()}`);
  lines.push("Current plan:");
  for (const m of context.milestones) {
    lines.push(
      `- Milestone ${m.id} (${m.title})` +
        (m.target_date ? ` target ${m.target_date}` : ""),
    );
    for (const t of context.tasks.filter((x) => x.milestone_id === m.id)) {
      lines.push(
        `    * Task ${t.id} "${t.title}" | status=${t.status} | priority=${
          t.priority ?? "medium"
        } | due=${t.due_at ?? "none"}` +
          (t.estimated_minutes ? ` | ${t.estimated_minutes}min` : ""),
      );
    }
  }
  lines.push("Return the proposed changes as JSON matching the schema.");
  return lines.join("\n");
}

export const REMINDER_RECOMMENDER_SYSTEM_PROMPT = `You are NEXA's reminder scheduler. Recommend a single reminder time for the given task.

OUTPUT: a SINGLE JSON object and NOTHING else, matching:
{ "remind_at": "ISO 8601 datetime ending in Z", "rationale": string, "lead_minutes": integer (>=0, optional) }

RULES:
- "remind_at" must be in the future, BEFORE the task's due time (a nudge ahead of the task), and within the goal deadline.
- Prefer the user's "default lead minutes" unless context (many missed tasks, high priority) justifies a different lead.
- Do NOT schedule within the user's quiet hours.
- This is a PROPOSAL the user will accept, change, or reject.
- This is a reminder delivered by a web app — never claim to set a device alarm or guarantee delivery.

PROHIBITED:
- Do not include secrets, API keys, or PII.
- Do not provide medical, legal, or financial advice.
- Do not override the user's master notification setting (you cannot disable/enable it).`;

export function buildReminderUserPrompt(context: ReminderContext): string {
  const lines: string[] = [
    `Task: ${context.task.title}`,
    `Task due at: ${context.task.due_at ?? "unspecified"}`,
  ];
  if (context.task.estimated_minutes) {
    lines.push(`Estimated duration: ${context.task.estimated_minutes} min`);
  }
  lines.push(`Goal: ${context.goal.title}`);
  if (context.goal.target_deadline) {
    lines.push(`Goal deadline: ${context.goal.target_deadline}`);
  }
  if (context.goal.constraints) {
    lines.push(`Constraints: ${context.goal.constraints}`);
  }
  lines.push(`Default lead minutes: ${context.defaultLeadMinutes}`);
  if (context.quietHours) {
    lines.push(`Quiet hours: ${context.quietHours.start}-${context.quietHours.end}`);
  }
  lines.push(`Recently missed tasks: ${context.recentMissedCount}`);
  lines.push(`Now: ${new Date().toISOString()}`);
  lines.push("Return the recommended reminder as JSON matching the schema.");
  return lines.join("\n");
}

export const WHATIF_PROMPT_VERSION = "whatif.v1";

export const WHATIF_SYSTEM_PROMPT = `You are NEXA's what-if simulator. The user asks a hypothetical question about their plan. Produce a READ-ONLY projection of what would happen. You do NOT change anything.

OUTPUT: a SINGLE JSON object and NOTHING else, matching:
{
  "scenario": string,
  "summary": string,
  "feasibility": "on_track" | "at_risk" | "exceeds_deadline",
  "deadline_impact": string,
  "changes": [
    { "type": "reschedule", "task_id": "<existing task id>", "due_at": "ISO 8601 datetime ending in Z" | null },
    { "type": "reprioritize", "task_id": "<existing task id>", "priority": "low" | "medium" | "high" },
    { "type": "add_task", "milestone_id": "<existing milestone id>", "title": string, "description": string, "estimated_minutes": integer (>0), "due_at": "ISO 8601 datetime ending in Z" | null, "priority": "low" | "medium" | "high", "order_index": integer (>=0) }
  ],
  "removed_task_ids": ["<existing task id>"],
  "conflicts": [string],
  "warnings": [string]
}

RULES:
- This is a PROJECTION only. Never change the user's goal deadline (you cannot).
- "changes" describe how the plan would be adjusted to fit the scenario. They may be empty if the scenario has no scheduling effect.
- Only reference task_id / milestone_id values that appear in the provided current plan.
- "removed_task_ids" are tasks the simulation suggests SKIPPING to fit the scenario (informational only — they are never auto-deleted).
- Set "feasibility" to "exceeds_deadline" if the scenario makes the goal impossible within the deadline; explain in "deadline_impact" and add a warning.
- Populate "conflicts" and "warnings" for scheduling conflicts, insufficient available time, or overload.
- Never invent completion/progress; never mark tasks done.

PROHIBITED:
- Do NOT delete data or change the goal deadline.
- Do NOT include secrets, API keys, or PII.
- Do NOT provide medical, legal, or financial advice.`;

export function buildWhatifUserPrompt(
  context: import("./replan-schema").ReplanContext,
  scenario: string,
): string {
  const lines: string[] = [
    `Goal: ${context.goal.title}`,
    `Hypothetical scenario: ${scenario}`,
  ];
  if (context.goal.targetDeadline) {
    lines.push(`Goal deadline (unchangeable): ${context.goal.targetDeadline}`);
  }
  if (context.goal.constraints) {
    lines.push(`Constraints: ${context.goal.constraints}`);
  }
  lines.push(`Today: ${new Date().toISOString()}`);
  lines.push("Current plan:");
  for (const m of context.milestones) {
    lines.push(
      `- Milestone ${m.id} (${m.title})` +
        (m.target_date ? ` target ${m.target_date}` : ""),
    );
    for (const t of context.tasks.filter((x) => x.milestone_id === m.id)) {
      lines.push(
        `    * Task ${t.id} "${t.title}" | status=${t.status} | priority=${
          t.priority ?? "medium"
        } | due=${t.due_at ?? "none"}` +
          (t.estimated_minutes ? ` | ${t.estimated_minutes}min` : ""),
      );
    }
  }
  lines.push("Return the simulation as JSON matching the schema.");
  return lines.join("\n");
}

export const NEXT_ACTION_PROMPT_VERSION = "next-action.v1";

export const NEXT_ACTION_SYSTEM_PROMPT = `You are NEXA's next-action advisor. Given the user's current plan and available time, recommend the SINGLE best task to do right now.

OUTPUT: a SINGLE JSON object and NOTHING else, matching:
{
  "recommended_task_id": "<existing task id>" | null,
  "recommended_task_title": string,
  "reason": string,
  "estimated_minutes": integer (>0) | null,
  "urgency": "low" | "medium" | "high",
  "expected_outcome": string,
  "alternative_task_id": "<existing task id>" | null,
  "alternative_task_title": string,
  "warnings": [string]
}

RULES:
- Pick from the provided incomplete tasks only. Use the provided task ids verbatim.
- Prefer the highest-priority, soonest-due task that FITS the available time. If available time is given, prefer a task whose estimate fits; if none fit, still recommend the most urgent one and add a warning.
- "reason" must explain the choice (priority, deadline, fit with available time, recent misses).
- If there are no incomplete tasks, set recommended_task_id to null and explain in "reason".
- "urgency" reflects deadline pressure. "expected_outcome" describes what completing the task achieves.
- This is a RECOMMENDATION only. You do not change anything.
- Never invent progress or claim a task was completed when it was not.

PROHIBITED:
- Do not reference task ids that are not in the provided list.
- Do not include secrets, API keys, or PII.
- Do not provide medical, legal, or financial advice.`;

export function buildNextActionUserPrompt(
  context: import("@/lib/db/mentor-context").MentorContext,
): string {
  const lines: string[] = [];
  lines.push(
    `Available time: ${context.availableMinutes ?? "unspecified"} minutes`,
  );
  lines.push(`Now: ${new Date().toISOString()}`);
  lines.push("Goals:");
  for (const g of context.goals) {
    lines.push(
      `- ${g.title} (priority ${g.priority}, deadline ${
        g.target_deadline ?? "none"
      }, status ${g.status})`,
    );
  }
  lines.push("Incomplete tasks:");
  for (const t of context.incompleteTasks) {
    lines.push(
      `- id=${t.id} "${t.title}" | status=${t.status} | priority=${t.priority} | due=${
        t.due_at ?? "none"
      } | est=${t.estimated_minutes ?? "?"}min | goal=${t.goal_title}`,
    );
  }
  if (context.missed.length) {
    lines.push(
      `Recently missed/skipped: ${context.missed
        .map((m) => `${m.title} (${m.status})`)
        .join(", ")}`,
    );
  }
  if (context.recentCompleted.length) {
    lines.push(
      `Recently completed: ${context.recentCompleted
        .map((c) => c.title)
        .join(", ")}`,
    );
  }
  lines.push(`Recent replans: ${context.recentReplanCount}`);
  lines.push("Return the recommendation as JSON matching the schema.");
  return lines.join("\n");
}

export const MENTOR_PROMPT_VERSION = "mentor.v1";

export const MENTOR_SYSTEM_PROMPT = `You are NEXA's AI mentor. Answer the user's question using ONLY their actual plan and task data provided below. Be concise and practical.

OUTPUT: a SINGLE JSON object and NOTHING else, matching:
{
  "reply": string,
  "references_tasks": [string],
  "warnings": [string]
}

RULES:
- Ground every answer in the provided data (goals, incomplete tasks, missed tasks, recent completions, replans).
- "references_tasks" lists task titles you mention.
- If asked whether the user is falling behind, judge from deadlines, missed tasks, and replans.
- Suggest concrete next steps that fit the user's tasks and time.

PROHIBITED:
- NEVER invent progress, completion, or outcomes. Never claim an action happened that the data does not show.
- Never state a task is done unless it appears in the completed list.
- If the data does not cover the question, say so honestly.
- Do not include secrets, API keys, or PII. Do not provide medical, legal, or financial advice.`;

export function buildMentorUserPrompt(
  context: import("@/lib/db/mentor-context").MentorContext,
  message: string,
): string {
  const lines: string[] = [`User question: ${message}`];
  lines.push(`Now: ${new Date().toISOString()}`);
  lines.push("Goals:");
  for (const g of context.goals) {
    lines.push(`- ${g.title} (deadline ${g.target_deadline ?? "none"})`);
  }
  lines.push("Incomplete tasks:");
  for (const t of context.incompleteTasks) {
    lines.push(
      `- "${t.title}" | status=${t.status} | priority=${t.priority} | due=${
        t.due_at ?? "none"
      } | goal=${t.goal_title}`,
    );
  }
  if (context.missed.length) {
    lines.push(
      `Missed/skipped: ${context.missed
        .map((m) => `${m.title} (${m.status})`)
        .join(", ")}`,
    );
  }
  if (context.recentCompleted.length) {
    lines.push(
      `Completed: ${context.recentCompleted.map((c) => c.title).join(", ")}`,
    );
  }
  lines.push(`Recent replans: ${context.recentReplanCount}`);
  lines.push("Return the reply as JSON matching the schema.");
  return lines.join("\n");
}

export const UNDERSTAND_PROMPT_VERSION = "understand.v1";

/**
 * NL intent classifier (Phase C). Decides WHICH existing NEXA capability a
 * free-form user message needs, and never invents content itself. The model
 * only classifies + summarizes; execution happens in the existing
 * next-action / what-if / replan / mentor engines.
 */
export const UNDERSTAND_SYSTEM_PROMPT = `You are NEXA's intent router. The user talks to NEXA in plain language about their goals and plan. Your ONLY job is to classify the user's message and summarize it — you never answer questions yourself, never simulate, and never propose plan changes. The real work is done by NEXA's specialized engines, which receive your classification.

Available intents (pick EXACTLY one):
- NEXT_ACTION: the user wants to know what to do next / tonight / today / this week.
- WHAT_IF_SIMULATION: the user describes a HYPOTHETICAL scenario ("what if...", "if I only have X", "imagine...", "suppose...") — the plan must NOT be changed.
- REPLAN_REQUEST: the user wants the overall plan revised (falling behind, too tight, catch up, finish earlier/later).
- SCHEDULE_CHANGE: the user wants specific task timings moved (move X to Saturday, shift to evening, reschedule due to travel/meetings).
- TASK_CHANGE: the user wants to modify a specific task (skip Python today, drop a task, change an estimate).
- PROGRESS_ANALYSIS: the user asks how they are doing, whether they are on track, behind, or ahead.
- MENTOR_ADVICE: the user asks for advice, motivation, or "why did you recommend this".
- QUESTION: anything else that is a question about their plan, the app, or general planning.

Rules:
- If the message could mean more than one thing, set "clarification_question" to ONE short question that disambiguates, and still pick the most likely intent.
- "scenario" is set ONLY for WHAT_IF_SIMULATION — rewrite the user's hypothetical in their own words (max 500 chars).
- "goal_id" is set ONLY when the message clearly references one goal from the provided list (use its exact id); otherwise null.
- "summary" is a one-line factual restatement of what the user wants (max 300 chars).
- Respond with a SINGLE JSON object matching exactly: {"intent": string, "goal_id": string|null, "summary": string, "clarification_question": string|null, "scenario": string|null}
- No markdown, no prose, nothing else.`;

export function buildUnderstandUserPrompt(
  context: {
    goals: Array<{ id: string; title: string; target_deadline: string | null }>;
    incompleteTasks: Array<{ id: string; title: string; due_at: string | null; goal_title: string }>;
    missed: Array<{ title: string; goal_title: string }>;
    recentCompleted: Array<{ title: string }>;
    availableMinutes: number | null;
  },
  message: string,
): string {
  const lines: string[] = [];
  lines.push("USER'S PLAN CONTEXT:");
  lines.push("Available minutes (if stated): " + (context.availableMinutes ?? "not stated"));
  if (context.goals.length) {
    lines.push(
      "Goals: " +
        context.goals
          .map((g) => `${g.id}|${g.title}${g.target_deadline ? " (deadline " + g.target_deadline.slice(0, 10) + ")" : ""}`)
          .join("; "),
    );
  } else {
    lines.push("Goals: none");
  }
  if (context.incompleteTasks.length) {
    lines.push(
      "Open tasks: " +
        context.incompleteTasks
          .map((t) => `${t.title} (due ${t.due_at ?? "unscheduled"}, goal=${t.goal_title})`)
          .join("; "),
    );
  }
  if (context.missed.length) {
    lines.push(`Missed/skipped: ${context.missed.map((m) => `${m.title} (${m.goal_title})`).join("; ")}`);
  }
  if (context.recentCompleted.length) {
    lines.push(`Completed: ${context.recentCompleted.map((c) => c.title).join("; ")}`);
  }
  lines.push("");
  lines.push(`USER MESSAGE: ${message}`);
  lines.push("");
  lines.push("Return the classification JSON now.");
  return lines.join("\n");
}

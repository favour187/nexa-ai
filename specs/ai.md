# AI Specification — NEXA

> **Status:** ✅ Approved draft v1.
> **Inference layer:** Featherless AI (OpenAI-compatible).
> **Governing principle:** _The AI proposes; the user disposes._

## 1. Role of the AI

Featherless AI is NEXA's **core inference layer**. The AI is never a loose
chatbot; it is a constrained set of capabilities operating over the user's
stored plan. Its outputs are **proposals and explanations**, persisted in
`ai_proposals` / `ai_events`, and applied **only** when the user accepts them
(architecture.md §4, §6).

## 2. Featherless integration (facts)

- OpenAI-compatible API; base URL `https://api.featherless.ai/v1`; Bearer auth
  via `FEATHERLESS_API_KEY`.
- Called **server-side only** through the OpenAI SDK (architecture.md §7).
- A single configurable primary model id (prefer a model family with native
  tool/function calling for structured output, e.g., Qwen3-class).
- Structured outputs (tool calling / JSON mode) are required for anything that
  becomes a proposal; free text is allowed only for explanations and chat.

## 3. AI responsibilities

The AI MUST be able to:

1. **Understand goals** — parse a plain-language goal into structured intent
   (title, implied milestone shape, constraints, implied deadline if any).
2. **Break goals into milestones and tasks** — produce typed
   `{ milestones: [{ title, order_index, target_date, tasks: [...] }] }`.
3. **Create schedules** — assign `due_at` to tasks, respecting the target
   deadline, task estimates, and ordering.
4. **Replan when circumstances change** — given missed/edited tasks or a changed
   deadline, produce an updated plan **as a draft proposal**.
5. **Choose the user's best next action** — return a single recommended task +
   a concise rationale ("What should I do now?").
6. **Explain decisions** — provide a human-readable rationale for any proposal
   or recommendation, stored alongside it.
7. **Run what-if scenarios** — given a hypothetical change, project the impact
   (e.g., feasibility vs. deadline) **read-only**, without touching real data.
8. **Detect when the user is falling behind** — identify schedule slippage /
   accumulating missed tasks and flag it.
9. **Create recovery plans** — when the user requests a replan after
   disruptions, propose a concrete recovery plan (draft) to get back on track,
   with rationale, via the standard replan proposal flow (§3.4, §6).

## 4. Required behaviors (quality bars)

- **Deterministic shape, not deterministic content:** structured outputs must
  conform to the schema; content may vary.
- **Always include rationale** for proposals and next-action picks.
- **Respect the active plan & history:** never ignore completed/missed tasks.
- **Cite constraints:** if a deadline is infeasible, say so and offer options
  rather than silently dropping tasks.
- **Bounded and safe:** timeouts/retries/fallbacks; never leave data in a
  half-applied state.

## 5. Prompt & context management

- Prompts are **versioned templates stored in the repo** (not improvised at
  runtime), so Prelint and reviewers can audit them.
- Context sent to the model is **scoped to the current goal/task** and
  minimized (no unrelated personal data, no secrets).
- The system prompt encodes the propose/apply rules (§6) so the model itself is
  instructed to return proposals, not actions.

## 6. What the AI IS and IS NOT allowed to do (hard rules)

**The AI is ALLOWED to:**

- Generate **draft** plans, replans, and recovery plans.
- Suggest the next action, reminder times, and explanations.
- Run **read-only** what-if projections.
- Surface slippage (missed/overdue tasks) in context — without changing any
  data (see §7).

**The AI is NOT ALLOWED to:**

- **Silently make important user decisions.** Specifically, it MUST NOT, without
  explicit user confirmation:
  - change, extend, or remove a **deadline** (`target_deadline` / `due_at`),
  - **delete** any user data (goals, plans, milestones, tasks, history),
  - **overwrite** an active plan (a new plan is always a draft until accepted),
  - mark a task `done` on the user's behalf,
  - change notification or account settings,
  - take any external action (send messages outside approved notification
    channels, make purchases, or call third-party APIs other than the
    Featherless inference endpoint).
- Store, log, or transmit secrets/credentials, or send them to the model.
- Access data outside the authenticated user's scope.
- Fabricate progress or mark tasks complete that the user did not do.
- Provide medical, legal, financial, or professional advice (must decline and
  suggest a qualified professional).
- Override the user's explicit settings (e.g., quiet hours, disabled
  notifications).
- Claim capabilities the platform lacks (e.g., ringing the phone's native alarm
  — see notifications.md).

**Confirmation model:** every action that is disallowed-as-automatic is emitted
as an `ai_proposal` with `status: pending`; the change is applied **only** when
the user accepts it via the accept endpoint. Rejected proposals are logged but
not applied.

## 7. Falling-behind awareness (non-destructive)

- The system computes slippage from `tasks` whose `due_at` has passed without a
  `completed_at` and surfaces it in the mentor context and next-action
  recommendation (lib/db/mentor-context.ts).
- Marking a task `missed` is a **user action** in the MVP. There is no
  auto-marking system rule; nothing is deleted or rescheduled automatically.
- When the user requests a replan (e.g., after disruptions), the AI generates a
  **recovery plan proposal** (§3.9) through the standard proposal flow.
  Extending a deadline is **never** automatic — it appears as a proposal
  requiring acceptance.

## 8. What-if simulations

- **Input:** a hypothetical change (e.g., "drop one task/week", "add 2 hours/
  week").
- **Output:** a projection (feasibility, revised finish date, risk level) shown
  to the user.
- **Constraint:** **no writes** to `goals` / `plans` / `tasks`. What-if is
  strictly read-only over a simulated copy.
- **Applying a simulation:** the simulation itself is read-only, but the user
  may APPLY it. Its validated change set is staged as a pending `replan`
  `ai_proposal` (`POST /api/proposals`) and applied **only** through the
  standard proposal accept (`POST /api/proposals/:id/accept`). This reuses the
  approved replan mechanism (§3.4, §6) and adds no new write path to
  `goals` / `plans` / `tasks`.

## 9. Failure & edge cases

- Model / Featherless errors → surface a clear message; never persist a partial
  plan.
- Unparseable structured output → retry once, then fail safe (no proposal).
- Empty / ambiguous goal → ask one clarifying question instead of guessing.
- Infeasible deadline → return options (tighten scope, extend the deadline as a
  proposal, reduce cadence); never silently drop tasks.

## 10. Natural-language intent routing (Phase C/E)

- A single entry point (`POST /api/ai/understand`) accepts free-form user
  messages. A classifier (the SAME Featherless client — no second AI system)
  maps the message to an internal intent:
  `QUESTION | WHAT_IF_SIMULATION | REPLAN_REQUEST | SCHEDULE_CHANGE |
  PROGRESS_ANALYSIS | NEXT_ACTION | MENTOR_ADVICE | TASK_CHANGE`.
- The intent is internal; the user never fills out a form or picks a category.
- Routing is strict:
  - `NEXT_ACTION` → the existing next-action engine (read-only).
  - `WHAT_IF_SIMULATION` → the existing what-if engine (read-only projection;
    applying still goes through the replan proposal flow — ai.md §8).
  - `REPLAN_REQUEST` / `SCHEDULE_CHANGE` / `TASK_CHANGE` → the existing replan
    engine; the result is stored as a **pending** `ai_proposal` that the user
    must accept (ai.md §6). Never applied silently.
  - `QUESTION` / `MENTOR_ADVICE` / `PROGRESS_ANALYSIS` → the existing grounded
    mentor chat.
- If the message is ambiguous, NEXA asks ONE short clarification question
  instead of guessing. If no goal can be resolved for a plan change, NEXA asks
  which goal.
- The classifier output is strictly validated (zod) with one retry, then fails
  safe — it never fabricates an intent or a response.

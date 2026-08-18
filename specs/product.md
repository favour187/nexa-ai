# Product Specification — NEXA

> **Status:** ✅ Approved draft v1 — defines product intent for implementation.
> **Tagline:** _"Don't just plan. Execute."_
> **Context:** Pixel Forge AI Hackathon 2026.

## 1. Overview

NEXA is an AI-powered **personal execution system**. It does not stop at helping
users *plan* — it turns a goal into a concrete, scheduled plan, keeps that plan
alive as circumstances change, and tells the user the single best thing to do
right now. The outcome NEXA optimizes for is **executed action**, not notes on a
page.

NEXA is built on three pillars:

1. **Plans that adapt** — goals are decomposed into milestones and tasks and
   rescheduled when reality changes.
2. **An AI mentor that understands context** — the assistant knows the user's
   current task, deadline pressure, and recent progress.
3. **Always an answer to "what now?"** — a context-aware recommendation for the
   next action, plus the ability to rehearse alternatives safely.

## 2. Problem

People fail to execute on their goals for predictable reasons:

- **Plans rot.** A plan made once goes stale the first time life interrupts;
  nobody re-plans, so the whole plan is abandoned.
- **Goals stay abstract.** "Get fit" or "launch the product" never becomes a
  next concrete step, so no progress happens.
- **Tools are passive.** Calendars, to-do lists, and chatbots record or discuss
  intent but do not *drive* the user toward the next action.
- **AI chat is ungrounded.** A generic chatbot can brainstorm but has no
  persistent memory of the user's plan, deadlines, or what was already done.

NEXA closes the gap between *deciding to do something* and *doing it*.

## 3. Target users

Primary:

- **Self-directed achievers** — people pursuing personal goals (fitness,
  learning, side projects, events) who are motivated but bad at scheduling and
  follow-through.

Secondary:

- **Students & professionals** juggling multiple deadlines who need help
  sequencing and prioritizing.
- **Hackathon / competition participants** (dogfooding context) managing a
  time-boxed, multi-task objective.

NEXA is a **single-user, personal** product in MVP. Multi-user collaboration,
sharing, and team plans are **out of MVP scope** (see §9).

## 4. Core user experience

The experience is centered on a small number of clear moments:

1. **Capture a goal** in plain language.
2. **See it become a plan** — milestones and scheduled tasks appear as a draft
   the user can accept or edit.
3. **Get told what to do now** — a persistent "What should I do now?" surface
   shows the recommended next action and why.
4. **Execute & check off** tasks; NEXA records progress.
5. **Adapt without friction** — when a task is missed or the situation changes,
   NEXA proposes an updated plan/recovery; it never silently rewrites things.
6. **Ask the mentor** — a context-aware chat that already knows the current task.

The default landing screen always answers: **"What should I do right now?"**

## 5. Main features

| # | Feature | Description |
|---|---------|-------------|
| F1 | Goal capture | Create a goal from natural language with an optional target deadline. |
| F2 | Plan generation | AI decomposes a goal into milestones → tasks and proposes a schedule (draft). |
| F3 | Schedule & deadlines | Tasks are placed on a timeline with due dates; deadlines are tracked. |
| F4 | Progress tracking | Users mark tasks done/missed/skipped; progress is recorded. |
| F5 | Adaptive replanning | When tasks are missed or circumstances change, NEXA proposes an updated plan. |
| F6 | "What should I do now?" | Context-aware recommendation of the single best next action + rationale. |
| F7 | AI mentor | Context-aware chat scoped to the user's current task and plan. |
| F8 | What-if simulation | Explore alternative plans/scenarios without changing the real plan. |
| F9 | Behind-detection & recovery | Detect when the user is falling behind and propose a recovery plan. |
| F10 | Notifications & reminders | Reminders/alarms within platform limits and user permissions (see notifications.md). |

All AI-driven changes to user data are **proposals requiring explicit user
confirmation** unless explicitly marked auto-apply (see §8 and ai.md §6).

## 6. Domain model (conceptual)

These entities are referenced across all specs. Storage fields are in
architecture.md §4.

- **Goal** — a high-level objective. Fields: title, description, priority,
  optional `target_deadline`, status (`active`, `paused`, `completed`,
  `archived`).
- **Plan** — the AI-generated structure for a goal. A plan is versioned. The
  **active** plan is what the user is executing; **drafts** are proposed plans
  awaiting acceptance.
- **Milestone** — an ordered checkpoint within a plan. Fields: title,
  `order_index`, optional `target_date`, status.
- **Task** — a concrete action within a milestone. Fields: title, description,
  `estimated_minutes`, `due_at`, status (`todo`, `in_progress`, `done`,
  `missed`, `skipped`, `postponed`), `status_reason` (optional reason for
  the current status), `created_at`, `completed_at`.
- **Schedule** — the assignment of tasks to time (dates/times) respecting the
  user's availability and deadlines.
- **Recovery Plan** — a special draft plan proposed when the user is behind.
- **AI Proposal / Explanation log** — a record of AI recommendations, their
  rationale, and whether the user accepted them (transparency).

## 7. User journey — from goal to completion

1. **Create goal.** User types: _"Run a half-marathon in 12 weeks."_ Optionally
   sets a deadline. → **Goal** created with status `active`.
2. **Generate plan (draft).** NEXA proposes a Plan: e.g., 4 milestones (Base,
   Build, Peak, Taper), each with weekly tasks, scheduled across 12 weeks.
3. **Review & accept.** User edits a couple of tasks, then accepts → the draft
   becomes the **active plan**; tasks are scheduled.
4. **"What should I do now?"** NEXA recommends the next task with a rationale
   (_"Easy 5 km run — it's your base-building week and you have 40 min today."_).
5. **Execute.** User does it and marks it `done`. Progress recorded.
6. **Interruption.** User misses two tasks due to a busy week.
7. **Detect & recover.** NEXA detects the user is behind and proposes a
   **Recovery Plan** (e.g., consolidate runs, shift the long run). It does
   **not** silently change the target deadline — it asks.
8. **What-if.** Before accepting, the user simulates: _"What if I drop one short
   run per week?"_ NEXA shows the projected impact without touching the real
   plan.
9. **Accept recovery.** User accepts; the active plan updates; the schedule
   reflows.
10. **Complete.** Final milestone tasks done; NEXA marks the Goal `completed`
    and summarizes the journey.

## 8. What makes NEXA different

| | Generic AI chatbot | Calendar/reminder app | **NEXA** |
|---|---|---|---|
| Persistent plan memory | ❌ | partial (events only) | ✅ full plan + history |
| Decomposes goals → tasks | ❌ | ❌ | ✅ |
| Auto-replans on disruption | ❌ | ❌ | ✅ (as proposals) |
| Picks the next action | ❌ | ❌ | ✅ |
| Explains its reasoning | sometimes | ❌ | ✅ |
| Rehearses alternatives safely | ❌ | ❌ | ✅ |
| Keeps the user in authority | n/a | n/a | ✅ (never silent destructive changes) |

The defining principle: **NEXA proposes, the user disposes.** Where a chatbot
only talks and a calendar only stores, NEXA *drives execution* while keeping the
human in authority over every important decision.

## 9. MVP scope vs. future features

**MVP (hackathon build):**

- F1 Goal capture (text + optional deadline).
- F2 Plan generation (draft) + accept/edit.
- F3 Basic scheduling & deadline tracking.
- F4 Progress tracking (mark done/missed).
- F5 Adaptive replanning on missed tasks (proposal).
- F6 "What should I do now?" recommendation + rationale.
- F7 AI mentor chat (task-scoped).
- F8 What-if simulation (read-only projection; an approved simulation may be applied via the replan proposal flow).
- F9 Behind-detection + recovery plan proposal.
- F10 In-app reminders + Web Notifications/Push within browser limits.
- Single-user accounts with auth.

**Explicitly NOT in MVP (future features):**

- Native mobile apps / native alarms (MVP is a web app; see notifications.md).
- Multi-user collaboration, shared/team goals, social features.
- Calendar / email / SMS integrations and two-way sync.
- Offline-first / full PWA install polish.
- Voice input/output.
- Habit/streak gamification, badges, leaderboards.
- Health/wearable data integrations.
- Marketplace of pre-built goal templates.
- Automated payments, bookings, or external API actions.

**Non-goals (things NEXA will deliberately not do):**

- Provide medical, legal, financial, or professional advice.
- Make decisions on the user's behalf without confirmation (see ai.md §6).
- Replace a professional calendar; it focuses on *execution*, not scheduling
  meetings.
- Store or transmit secrets/credentials (see architecture.md §9).

## 10. Success criteria (hackathon)

- A user can go from a plain-language goal to an accepted plan in under 2
  minutes.
- "What should I do now?" returns a single actionable recommendation with a
  one-line rationale.
- Missing tasks reliably triggers a recovery proposal — never a silent plan
  rewrite.
- Reminders work within documented web-platform limits, with clear user control.

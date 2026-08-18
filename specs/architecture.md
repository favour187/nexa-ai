# Architecture Specification — NEXA

> **Status:** ✅ Approved draft v1.
> **Scope:** MVP web application for Pixel Forge AI Hackathon 2026.
> **Cross-references:** product.md (domain model), ai.md (AI layer),
> notifications.md (notifications), prelint.md (enforcement).

## 1. Design principles

1. **Practical and fast.** Choose the smallest set of technologies that lets a
   small team ship the MVP during a hackathon.
2. **One platform where possible.** Avoid spreading across many vendors.
3. **AI is server-side only.** The model-provider key never reaches the browser.
4. **Propose, don't apply.** No component may silently perform destructive or
   important user-facing changes (see ai.md §6).
5. **Honest platform limits.** Do not architect around capabilities the web
   platform does not provide (see notifications.md).

## 2. Technology stack & rationale

| Layer | Choice | Why (hackathon fit) |
|-------|--------|---------------------|
| Language | **TypeScript** | One language across client/server; type safety reduces bugs under time pressure. |
| Frontend + API | **Next.js** (App Router) | One framework for UI and server API routes; fast DX; trivial deploy; mature ecosystem. |
| Database | **PostgreSQL** (managed via Supabase) | Relational model fits goals→milestones→tasks; managed free tier; no server ops. |
| Data access | **Supabase JS client** + Row-Level Security | Single SDK for DB + auth; RLS enforces per-user isolation at the database. |
| Auth | **Supabase Auth** (email/password + OAuth) | Pairs with the DB on one platform; reduces vendors; battle-tested. |
| AI inference | **Featherless AI** (OpenAI-compatible) | Serverless, no GPU management; OpenAI SDK reuse; broad open-model catalog (see ai.md). |
| Spec guardrails | **Prelint** (GitHub app) | Enforces product intent on every PR (see prelint.md). |
| Hosting | **Vercel** (Next.js) + **Supabase** (DB/auth) | Zero-config deploys; generous free tiers; fast to stand up. |

> This stack is intentionally narrow: **Next.js + Supabase + Featherless**
> (+ Prelint). Nothing else is introduced unless a spec requirement demands it.
> If a future requirement (e.g., background scheduling at scale) cannot be met
> by this set, it is added via a **spec change reviewed by Prelint**.

## 3. High-level components

```
┌────────────────────────────────────────────────────────────────┐
│  Browser (Next.js client)                                       │
│   • Goal / plan / task UI                                       │
│   • "What should I do now?" surface                             │
│   • AI mentor chat                                              │
│   • Service worker (notifications; see notifications.md)        │
└───────────────▲───────────────────────────────────▲────────────┘
                │ HTTPS (REST/JSON)                  │ Web Push (best-effort)
                │ (same-origin API routes)           │
┌───────────────┴───────────────────────────────────┴────────────┐
│  Next.js server (Route Handlers) — the API edge                 │
│   • Auth-aware request handling                                 │
│   • AI Service (orchestration; propose/apply boundary)          │
│   • Notification scheduler                                      │
└───────▲───────────────────────────────────────────▲────────────┘
        │ Supabase JS (service role, server only)    │ OpenAI-compatible HTTPS
        │                                            │ (baseURL api.featherless.ai/v1)
┌───────┴──────────────┐                 ┌───────────┴──────────────┐
│  Supabase Postgres   │                 │  Featherless AI          │
│  + Auth + RLS        │                 │  (inference)             │
└──────────────────────┘                 └──────────────────────────┘
```

## 4. Data model (Postgres)

Tables mirror the domain model in product.md §6. RLS ensures every row is scoped
to the authenticated user.

- **goals**: `id`, `user_id`, `title`, `description`, `priority`,
  `target_deadline` (timestamptz, nullable), `status`, `created_at`,
  `updated_at`, `constraints` (text, nullable — Phase 2).
- **plans**: `id`, `goal_id`, `version`, `status` (`draft` | `active`),
  `source` (`generated` | `recovery` | `edited`), `created_at`, `strategy`
  (text, nullable — Phase 2), `rationale` (text, nullable — Phase 2). Only one
  `active` plan per goal; drafts coexist until accepted.
- **milestones**: `id`, `plan_id`, `title`, `order_index`, `target_date`,
  `status`.
- **tasks**: `id`, `milestone_id`, `title`, `description`, `estimated_minutes`,
  `due_at` (timestamptz), `status` (`todo` | `in_progress` | `done` | `missed`
  | `skipped` | `postponed` — `postponed` added Phase 3), `priority` (`low` |
  `medium` | `high`, default `medium` — Phase 2), `status_reason` (text, nullable
  — Phase 3), `created_at`, `completed_at`, `order_index` (integer, default 0 —
  Phase 2).
- **ai_proposals** (created Phase 3): `id`, `user_id`, `goal_id`, `kind` (`plan`
  | `recovery` | `next_action` | `reminder_time` | `replan`), `payload` (jsonb),
  `rationale` (text), `status` (`pending` | `accepted` | `rejected`),
  `applied_at` (timestamptz, nullable), `created_at`. Every AI output that would
  change data is stored here as a proposal the user accepts/rejects. This table
  is the mechanism that enforces "propose, don't apply."
- **ai_events** (decision/explanation log; created Phase 3): `id`, `user_id`,
  `goal_id`, `type`, `summary`, `rationale`, `accepted` (bool), `payload`
  (jsonb — e.g. a before-snapshot for history), `created_at` — the transparency
  log.
- **notification_settings** (created Phase 4): `user_id` (pk), `enabled`,
  `channels` (jsonb), `quiet_hours` (jsonb), `default_lead_minutes`,
  `allow_ai_suggested_times` (bool), `push_subscribed` (bool), `created_at`,
  `updated_at`.
- **reminder_schedules** (created Phase 4): `id`, `task_id`, `user_id`,
  `remind_at` (timestamptz), `delivered` (bool), `channel`, `enabled` (bool,
  default true — Phase 4), `lead_minutes` (integer, nullable — Phase 4),
  `created_at`.

**Status invariants:**

- A goal has at most one `active` plan.
- `task.status` transitions are user-initiated or applied via an accepted
  proposal. The system **may** mark a task `missed` via an explicit, logged,
  non-destructive rule once `due_at` passes (see ai.md §7) — this is reversible
  and does not delete or reschedule anything.

## 5. Authentication

- Supabase Auth issues a JWT per session.
- All API routes require a valid session; the `user_id` is derived from the JWT,
  **never** from client input.
- RLS enforces that a user can read/write only rows where
  `user_id = auth.uid()`.
- The **service-role key is used only server-side** for operations that need
  elevated privilege (e.g., writing `ai_proposals`, sending push). It is never
  shipped to the browser.

## 6. API structure

REST/JSON over Next.js Route Handlers, grouped by resource. All mutating AI
endpoints return **proposals**, not applied changes (except where noted).

**Goals & plans**

- `POST /api/goals` — create goal; triggers plan generation as a **draft**.
- `GET /api/goals`, `GET /api/goals/:id`
- `POST /api/goals/:id/plan` — regenerate a **draft** plan.
- `POST /api/plans/:id/accept` — promote a draft to active (**user action**).
- `POST /api/goals/:id/recover` — request a **recovery plan** (draft).

**Tasks & progress**

- `GET /api/tasks?goal_id=…`
- `PATCH /api/tasks/:id` — update status (**user action**; `missed` may also be
  set by the system rule in ai.md §7).

**AI (return proposals/explanations unless noted)**

- `POST /api/ai/next-action` — "What should I do now?" (recommendation +
  rationale).
- `POST /api/ai/what-if` — read-only projection; changes nothing.
- `POST /api/ai/explain` — explain a decision/proposal.
- `POST /api/ai/replan` — propose an updated plan (draft).
- `POST /api/ai/chat` — mentor chat, scoped to a task/goal context.

**Proposals**

- `GET /api/proposals` — list pending proposals.
- `POST /api/proposals/:id/accept` | `/reject` — **user action** that applies
  or discards the proposed change.

**Notifications**

- `GET` / `PUT /api/notifications/settings`
- `POST /api/notifications/push/subscribe` — store a Web Push subscription.
- `DELETE /api/notifications/push/subscribe`

Every response that changes user data references the `ai_proposal` it relied on
and its `rationale`, so the UI can show "why" and request confirmation.

## 7. Featherless AI integration

- **Server-side only.** Calls happen inside Next.js API routes / the AI Service.
- **Client:** the OpenAI SDK configured with
  `baseURL: "https://api.featherless.ai/v1"` and
  `apiKey: process.env.FEATHERLESS_API_KEY`.
- **Model:** a single configurable primary model id in environment/config
  (prefer a model family with native tool/function calling for structured
  output, e.g., a Qwen3-class model). The model id is configured in one place,
  not scattered across the codebase.
- **Structured output:** plan generation uses function/tool calling or JSON mode
  to return typed `{ milestones: [{ tasks: [...] }] }`; output is validated
  before it becomes a proposal.
- **Resilience:** timeouts, bounded retries, and graceful fallbacks (e.g.,
  surface a clear error instead of a half-applied plan).

Detailed AI responsibilities and boundaries: ai.md.

## 8. Notification / reminder architecture (summary)

- **While the app is open:** in-app timers fire visible + audible reminders.
- **While closed:** a server scheduler enqueues reminders; at due time it sends a
  Web Push notification **if** the user granted notification permission **and**
  subscribed to push. This is best-effort and platform/browser-dependent.
- **No native phone alarms.** The web app cannot set the device's native alarm
  clock or bypass Do Not Disturb. Full details and limits: notifications.md.

## 9. Security & privacy boundaries

- Featherless key + Supabase service-role key live **only** in server
  environment variables; never in the client bundle; never committed (enforced
  by `.gitignore` and Prelint).
- All traffic over HTTPS/TLS.
- RLS isolates every user's data at the database.
- **Data minimization to the model:** send only the task/plan context required
  for the request; avoid sending unrelated personal data.
- Input validation on every route; rate limiting on AI endpoints (cost + abuse).
- Logs must never contain secrets, API keys, or raw credentials.
- All AI-driven data changes are proposals confirmed by the user
  (`ai_proposals`). No silent destructive operations exist in the API surface.
- PII / retention: user goal/task content is stored only to serve the user; a
  "delete my data" flow is a hard requirement before any broader release.

## 10. Component communication

- **Browser ↔ Next.js API:** HTTPS REST/JSON, same-origin; JWT in session.
- **Next.js API ↔ Postgres:** Supabase JS, service-role server-side, RLS on.
- **Next.js API ↔ Featherless:** HTTPS, OpenAI-compatible, server-only.
- **Next.js API ↔ Browser (push):** Web Push via the browser push service +
  service worker; subscription stored server-side.
- **Scheduling:** a lightweight server-side scheduler (e.g., Vercel Cron or a
  queue) scans `reminder_schedules` at due time and dispatches push/in-app
  notifications per notifications.md.

# NEXA

> **Don't just plan. Execute.**

NEXA is an **AI-powered personal execution system**. It turns a plain-language
goal into a scheduled plan of milestones and tasks, keeps that plan alive as
circumstances change, and always tells you the single best thing to do right now.
Where a chatbot only talks and a calendar only stores, NEXA **drives execution** —
while keeping you in authority over every important decision.

Built for the **Pixel Forge AI Hackathon 2026**.

---

## ✨ Main features

- **Goals → Plans** — capture a goal in plain language; NEXA drafts milestones
  and scheduled tasks.
- **Adaptive replanning** — when tasks are missed or life changes, NEXA proposes
  an updated plan (never silently); recovery plans arrive through the same
  proposal flow.
- **"What should I do now?"** — a single, context-aware next action with a
  one-line rationale.
- **AI mentor** — a chat that already knows your current task and deadline
  pressure.
- **What-if simulations** — rehearse alternative plans safely, without touching
  your real plan.
- **Behind-awareness** — missed tasks are surfaced in context and a requested
  replan produces a recovery proposal, never a silent rewrite.
- **Deadline tracking & reminders** — track progress and get in-app + browser
  reminders while the app is open, within your device/browser's permissions.

> The AI **proposes**; the user **disposes**. NEXA never silently changes a
> deadline or deletes your data. See [`specs/ai.md`](./specs/ai.md).

## 🧠 Technology architecture overview

A deliberately narrow stack chosen for a fast hackathon build
([`specs/architecture.md`](./specs/architecture.md)):

| Layer | Technology |
|-------|-----------|
| Frontend + API | **Next.js** (App Router, TypeScript) |
| Database + Auth | **Supabase** (PostgreSQL, Row-Level Security, Auth) |
| AI inference | **Featherless AI** (OpenAI-compatible, server-side) |
| Spec guardrails | **Prelint** (product review on every PR) |
| Hosting | **Render** (web service) + **Supabase** (DB/auth) |

Live demo: <https://thenexa-ai.xyz/> · Health: `/api/health`

```
Browser (Next.js) ──HTTPS──▶ Next.js API ──▶ Supabase Postgres (RLS)
                                   └───────▶ Featherless AI (server-only)
              In-app toasts + browser notifications while the app is open
```

## 🔌 Featherless AI's role

[Featherless AI](https://featherless.ai/) is NEXA's **core AI inference layer** —
a serverless, OpenAI-compatible API (`https://api.featherless.ai/v1`) giving
access to open-source models with no GPU management. NEXA calls it
**server-side only** (the API key never reaches the browser or the repo) to:
understand goals, break them into milestones/tasks, schedule and replan, pick the
next action, explain decisions, run what-ifs, and propose replans/recovery
plans. Details: [`specs/ai.md`](./specs/ai.md).

## 🛡️ Prelint's role

[Prelint](https://prelint.com/) is our **product-review layer**. It reviews
**every pull request** against the specifications in [`specs/`](./specs),
flagging product drift, spec contradictions, conflicting technology choices, and
scope creep before they merge. It complements (it does not replace) code review.
Open-source projects use Prelint for free. Details:
[`specs/prelint.md`](./specs/prelint.md).

## 📁 Repository structure

```
nexa-ai/
├── app/                  # Next.js App Router: pages, API routes, layouts
├── components/           # UI primitives & layout components
├── lib/                  # Supabase clients, data layer, API client, env
├── types/                # Shared TypeScript domain types
├── supabase/migrations/  # PostgreSQL schema + Row-Level Security
├── tests/                # Vitest unit tests
├── specs/                # Product & architecture specifications (v1)
│   ├── product.md        # Problem, users, features, MVP scope
│   ├── architecture.md   # Stack, data model, API, security
│   ├── ai.md             # Featherless AI responsibilities & hard limits
│   ├── notifications.md  # Reminders within real web-platform limits
│   └── prelint.md        # How Prelint protects product intent
├── README.md
├── LICENSE               # MIT
└── .gitignore
```

## 🚧 Development status

**Phases 1–6 implemented.** The `specs/` directory is the source of truth.

Implemented:

- **Foundation** (Phase 1): Next.js app shell, routing, Supabase auth, Postgres
  data layer with Row-Level Security, health + goals API, typed API client,
  base UI with error/loading states.
- **AI goal planning** (Phase 2): Featherless generates a structured, validated
  plan (goal → milestones → tasks), saved as a draft the user accepts.
- **Adaptive replanning** (Phase 3): mark tasks completed/missed/skipped/
  postponed; the AI proposes a change set the user approves (atomic apply with
  history preserved).
- **Smart notifications & reminders** (Phase 4): browser-notification
  permissions, reminder CRUD, opt-in AI-suggested reminder times, in-app +
  browser delivery while the app is open, quiet hours, settings.
- **What-if simulation** (Phase 5): read-only projections; apply through the
  replan proposal flow.
- **AI mentor & "What should I do now?"** (Phase 6): context-aware next-action
  recommendation and a grounded mentor chat.

The AI always **proposes**; the user **disposes** — it never silently changes a
deadline or deletes data (`specs/ai.md`).

**Not in MVP (documented in `specs/`):** snooze and sound/vibration reminders,
native mobile alarms, collaboration, and calendar/email/SMS integrations.

**Background push:** a service worker (`/sw.js`) receives Web Push when the
NEXA tab is closed. GitHub Actions (`.github/workflows/dispatch-reminders.yml`)
hits `/api/notifications/dispatch` every 5 minutes so Render wakes and due
reminders fire. If migration `0005` is not applied yet, device subscriptions
are stored on `notification_settings` so send still works.

See [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## 🛠️ Getting started (local)

Prerequisites: Node.js 20+ and a [Supabase](https://supabase.com/) project.

```bash
cp .env.example .env.local        # add your Supabase URL, anon key, service-role key
npm install
npm run dev                       # http://localhost:3000
```

Apply the database schema in your Supabase project using the SQL files in
[`supabase/migrations/`](./supabase/migrations) **in order** (`0001`–`0005`)
via the SQL editor or `supabase db push`. The public Supabase URL + anon key
are baked into the client bundle as fallbacks (the anon key is RLS-protected,
not secret), so auth/database features boot configured everywhere; the
server-only keys (`SUPABASE_SERVICE_ROLE_KEY`, `FEATHERLESS_API_KEY`,
`VAPID_PRIVATE_KEY`) must be provided in the deployment environment for AI
planning, admin operations, and background push.

Useful scripts:

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run lint       # ESLint (next/core-web-vitals)
npm run typecheck  # tsc --noEmit
npm run test       # Vitest unit tests
npm run db:check   # probe Supabase connectivity
```

## 🔐 Security

This repository **never** contains secrets, API keys, or credentials (including
Featherless/Supabase keys). Secrets are server-side environment variables only.
The Supabase service-role key is used server-side only (guarded by the
`server-only` package). See `.gitignore` and
[`specs/architecture.md`](./specs/architecture.md).

## 📜 License

[MIT](./LICENSE) © 2026 NEXA Contributors.


## 🔐 Environment variables (deployment)

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build-time (hardcoded fallbacks in `scripts/write-env.mjs` + `lib/env.ts`) | Public — RLS-protected |
| `SUPABASE_SERVICE_ROLE_KEY` | Server env only | **Secret** — used by the push dispatcher |
| `FEATHERLESS_API_KEY` | Server env only | **Secret** — AI routes |
| `NEXA_FEATHERLESS_MODEL` | Optional | Default `Qwen/Qwen3-32B` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Build-time (hardcoded fallback in `lib/push/vapid.ts`) | Public by design |
| `VAPID_PRIVATE_KEY` | Server env only | **Secret** — Web Push signing |
| `VAPID_SUBJECT` | Server env only | `mailto:you@example.com` — Web Push contact |
| `DISPATCH_TOKEN` | Optional, server env only | Protects `/api/notifications/dispatch` |

Full production guide: [`DEPLOYMENT.md`](./DEPLOYMENT.md) · Blueprint: [`render.yaml`](./render.yaml).

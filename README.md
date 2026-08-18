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
  an updated plan (never silently).
- **"What should I do now?"** — a single, context-aware next action with a
  one-line rationale.
- **AI mentor** — a chat that already knows your current task and deadline
  pressure.
- **What-if simulations** — rehearse alternative plans safely, without touching
  your real plan.
- **Behind-detection & recovery** — NEXA notices when you're slipping and
  proposes a recovery plan.
- **Deadline tracking & reminders** — track progress and get reminders within
  your device/browser's permissions.

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
| Hosting | Vercel + Supabase |

```
Browser (Next.js) ──HTTPS──▶ Next.js API ──▶ Supabase Postgres (RLS)
                                   └───────▶ Featherless AI (server-only)
                            Service worker ◀── Web Push (best-effort)
```

## 🔌 Featherless AI's role

[Featherless AI](https://featherless.ai/) is NEXA's **core AI inference layer** —
a serverless, OpenAI-compatible API (`https://api.featherless.ai/v1`) giving
access to open-source models with no GPU management. NEXA calls it
**server-side only** (the API key never reaches the browser or the repo) to:
understand goals, break them into milestones/tasks, schedule and replan, pick the
next action, explain decisions, run what-ifs, detect slippage, and propose
recovery plans. Details: [`specs/ai.md`](./specs/ai.md).

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

**Phase 1 — application foundation: implemented.** The `specs/` directory is the
source of truth, and the foundation follows it under Prelint review.

Implemented so far: the Next.js app shell and routing, Supabase authentication,
the PostgreSQL data layer (with Row-Level Security) for goals/plans/milestones/
tasks, the `/api/health` and goals API endpoints, the typed API client, and the
base UI/layout system with error and loading states.

**Not yet built (deferred to later phases):** the AI planner (Featherless),
notifications/alarms, and what-if simulations. The AI must always propose, never
silently apply, important user decisions (see `specs/ai.md`).

## 🛠️ Getting started (local)

Prerequisites: Node.js 20+ and a [Supabase](https://supabase.com/) project.

```bash
cp .env.example .env.local        # add your Supabase URL, anon key, service-role key
npm install
npm run dev                       # http://localhost:3000
```

Apply the database schema in your Supabase project using
[`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) (via
the SQL editor or `supabase db push`). The app boots even without Supabase keys
(in a "not configured" mode); authentication and data features require the keys
and the applied migration.

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

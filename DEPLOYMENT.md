# NEXA — Production Deployment (Render)

This guide deploys the existing NEXA application to Render without changing the
architecture, the database (Supabase/Neon-compatible Postgres), or the Featherless
AI integration.

> NEXA is a **single Next.js application** (frontend UI + API routes on the same
> origin). It deploys as **one Render Web Service** running `next start`. It is
> **not** a static site: it relies on server-side API routes, SSR, server-only
> secrets, and middleware.

---

## 1. Prerequisites

- A Render account (https://render.com).
- A Supabase project (Postgres + Auth) with the SQL migrations applied
  (see `supabase/migrations/`). The task refers to "Neon"; NEXA's approved
  architecture uses **Supabase Postgres** — the same relational model — so the
  Supabase project is the production database. Do not move the database.
- A Featherless AI API key (https://featherless.ai).

## 2. Apply database migrations (in Supabase, not Render)

Run the SQL files in order in the Supabase **SQL editor** (or `supabase db push`):

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_ai_planning.sql`
3. `supabase/migrations/0003_adaptive_replanning.sql`
4. `supabase/migrations/0004_smart_notifications.sql`

These create the tables, Row-Level Security policies, and PL/pgSQL functions.
**Do not delete existing data.** Render does **not** run migrations.

## 3. Create the Render service

- New → **Web Service** → connect this repo → branch `main`.
- Runtime: **Node**. Render reads `.nvmrc` (Node 20).
- Build: `npm ci && npm run build`
- Start: `npm run start`
- Health check path: `/api/health`

(Alternatively, use this repo's `render.yaml` Blueprint: New → Blueprint →
connect repo. Secret env vars are entered in the dashboard.)

## 4. Environment variables (set in Render — names only, never commit values)

| Variable | Exposure | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public (build-time) | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public (build-time) | yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | yes | privileged DB ops (health probe) |
| `FEATHERLESS_API_KEY` | server-only | yes | Featherless AI inference |
| `NEXA_FEATHERLESS_MODEL` | server-only | no | model id (default `Qwen/Qwen3-32B`) |

> `NEXT_PUBLIC_*` variables are **inlined at build time** by Next.js, so they
> must be set in Render **before** the first build. The Featherless and
> service-role keys are server-only and are never sent to the browser.

There is **no `DATABASE_URL`/Neon connection string** in the app — NEXA connects
to Supabase Postgres over HTTPS via the Supabase SDK using the URL + keys above.
Supabase Auth issues/signs JWTs internally, so no separate auth secret is needed.

## 5. CORS

Because the frontend and API share the **same origin** (one Next.js service),
no cross-origin CORS configuration is required. The browser client calls
same-origin `/api/*` routes with `credentials: "same-origin"`.

If you ever host the frontend separately from the API, add an explicit CORS
allowlist at that time. No such config is needed for this deployment.

## 6. Verify after deploy

- `GET https://<your-render-url>/api/health` → HTTP 200 with `status` JSON.
- Open the frontend → register/login → create a goal → an AI plan is generated
  and saved → view milestones/tasks → create a reminder → complete/postpone a
  task → adaptive replanning → what-if simulation → "What should I do now?".
- Confirm `services.database` in `/api/health` becomes reachable once the
  service-role key + Supabase URL are set.

## 7. Security checklist

- No secrets, API keys, or DB credentials are committed (`.gitignore` covers
  `.env*`; only empty `.env.example` is tracked).
- The Featherless key and Supabase service-role key are server-only
  (`lib/ai/client.ts` imports `server-only`).
- API routes return **generic** error messages; internal details are logged
  server-side only — no stack traces, keys, prompts, or PII to the client.
- Row-Level Security enforces that each user can access only their own data.
- AI outputs are validated before use; the AI never silently applies changes.

## 8. Local production build (pre-deploy check)

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run start   # http://localhost:3000
```

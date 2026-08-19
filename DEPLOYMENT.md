# NEXA — Production Deployment (Render)

This guide deploys the existing NEXA application to Render without changing the
architecture, the database (Supabase Postgres), or the Featherless AI integration.

> NEXA is a **single Next.js application** (frontend UI + API routes on the same
> origin). It deploys as **one Render Web Service** running `next start`. It is
> **not** a static site: it relies on server-side API routes, SSR, server-only
> secrets, and middleware.

Live service: <https://nexa-ai-t1ce.onrender.com> · Health: `/api/health`

---

## 1. Prerequisites

- A Render account (https://render.com).
- A Supabase project (Postgres + Auth) with the SQL migrations applied
  (see `supabase/migrations/`).
- A Featherless AI API key (https://featherless.ai).
- A VAPID key pair for Web Push (`npx web-push generate-vapid-keys`). The
  **public** key is already baked into the client as a fallback
  (`lib/push/vapid.ts`). The **private** key and a contact subject
  (`mailto:you@example.com`) stay in the Render environment only.

## 2. Apply database migrations (in Supabase, not Render)

Run the SQL files in order in the Supabase **SQL editor** (or `supabase db push`):

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_ai_planning.sql`
3. `supabase/migrations/0003_adaptive_replanning.sql`
4. `supabase/migrations/0004_smart_notifications.sql`
5. `supabase/migrations/0005_push_notifications.sql` — **required for background Web Push**

These create the tables, Row-Level Security policies, and PL/pgSQL functions.
**Do not delete existing data.** Render does **not** run migrations.

`/api/health` reports `services.push.tableReady`. If it is `false`, migration
`0005` has not been applied.

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
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | yes | privileged DB ops (health probe + push dispatch) |
| `FEATHERLESS_API_KEY` | server-only | yes | Featherless AI inference |
| `NEXA_FEATHERLESS_MODEL` | server-only | no | model id (default `Qwen/Qwen3-32B`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | public (build-time) | no | Web Push public key (fallback is baked in) |
| `VAPID_PRIVATE_KEY` | server-only | for push | Web Push signing |
| `VAPID_SUBJECT` | server-only | for push | `mailto:you@example.com` |
| `DISPATCH_TOKEN` | server-only | recommended | Protects `/api/notifications/dispatch` |

> `NEXT_PUBLIC_*` variables are **inlined at build time** by Next.js, so they
> must be set in Render **before** the first build. The Featherless, service-role,
> and VAPID private keys are server-only and are never sent to the browser.

There is **no `DATABASE_URL`/Neon connection string** in the app — NEXA connects
to Supabase Postgres over HTTPS via the Supabase SDK using the URL + keys above.
Supabase Auth issues/signs JWTs internally, so no separate auth secret is needed.

## 5. Background push scheduler

The dispatch endpoint does **not** run by itself. Point an external pinger
(UptimeRobot, cron-job.org, or a paid Render Cron Job) at:

```
GET https://nexa-ai-t1ce.onrender.com/api/notifications/dispatch
```

every 5 minutes. If `DISPATCH_TOKEN` is set, send header
`x-dispatch-token: <token>`.

Render **free** web services sleep and have no cron. The pinger also wakes the
service so due reminders can fire.

Honest capability: NEXA can deliver push notifications in the background even
when the NEXA webpage is not open, **subject to browser/device permissions and
platform/network availability**. It is not a native alarm clock.

## 6. CORS

Because the frontend and API share the **same origin** (one Next.js service),
no cross-origin CORS configuration is required. The browser client calls
same-origin `/api/*` routes with `credentials: "same-origin"`.

If you ever host the frontend separately from the API, add an explicit CORS
allowlist at that time. No such config is needed for this deployment.

## 7. Verify after deploy

- `GET https://<your-render-url>/api/health` → HTTP 200 with `status` JSON.
  Expect `services.database.reachable: true`, `services.ai.configured: true`.
  For push: `services.push.configured: true` and `services.push.tableReady: true`.
- Open the frontend → register/login → create a goal → an AI plan is generated
  and saved → view milestones/tasks → create a reminder → complete/postpone a
  task → adaptive replanning → what-if simulation → "What should I do now?".
- Settings → enable browser notifications → enable background push.

## 8. Security checklist

- No secrets, API keys, or DB credentials are committed (`.gitignore` covers
  `.env*`; only empty `.env.example` is tracked).
- The Featherless key, Supabase service-role key, and VAPID private key are
  server-only (`server-only` package on privileged modules).
- API routes return **generic** error messages; internal details are logged
  server-side only — no stack traces, keys, prompts, or PII to the client.
- Row-Level Security enforces that each user can access only their own data.
- AI outputs are validated before use; the AI never silently applies changes.

## 9. Local production build (pre-deploy check)

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm run start   # http://localhost:3000
```

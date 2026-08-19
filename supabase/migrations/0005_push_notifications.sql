-- =============================================================================
-- NEXA Phase D — Web Push subscriptions
-- Stores per-user push subscriptions for background delivery (notifications.md
-- §3-§5, architecture.md §4). Only the minimal subscription data is kept;
-- VAPID private keys live in server env vars and are never stored here.
-- =============================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_secret text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_push_subs_user on public.push_subscriptions (user_id);

-- ---- Row Level Security (user sees/edits only their own subscriptions) ------
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subs_owner_all" on public.push_subscriptions;
create policy "push_subs_owner_all" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The scheduler runs with the service-role client (server-only), which
-- bypasses RLS by design — it may read any user's subscriptions to deliver
-- that user's own reminders, but it is never exposed to the browser.

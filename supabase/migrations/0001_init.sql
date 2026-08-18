-- =============================================================================
-- NEXA initial schema — Phase 1
-- Aligns with specs/architecture.md §4.
--
-- Phase 1 entities: goals, plans, milestones, tasks (+ users via Supabase Auth).
-- plans is included because the spec defines milestones.plan_id (milestones
-- cannot exist without plans). AI/notification tables (ai_proposals, ai_events,
-- notification_settings, reminder_schedules) are intentionally deferred to the
-- AI / notifications phases.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 200),
  description     text check (char_length(description) <= 2000),
  priority        text not null default 'medium' check (priority in ('low','medium','high')),
  target_deadline timestamptz,
  status          text not null default 'active' check (status in ('active','paused','completed','archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.plans (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals(id) on delete cascade,
  version    integer not null default 1,
  status     text not null default 'draft' check (status in ('draft','active')),
  source     text not null default 'generated' check (source in ('generated','recovery','edited')),
  created_at timestamptz not null default now()
);

-- At most one active plan per goal (specs/architecture.md §4 status invariant).
create unique index if not exists plans_one_active_per_goal
  on public.plans (goal_id) where status = 'active';

create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.plans(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  order_index integer not null default 0,
  target_date date,
  status      text not null default 'todo' check (status in ('todo','in_progress','done','skipped')),
  created_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id               uuid primary key default gen_random_uuid(),
  milestone_id     uuid not null references public.milestones(id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 200),
  description      text check (char_length(description) <= 2000),
  estimated_minutes integer check (estimated_minutes >= 0),
  due_at           timestamptz,
  status           text not null default 'todo' check (status in ('todo','in_progress','done','missed','skipped')),
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

-- ---------------------------------------------------------------------------
-- Triggers / indexes
-- ---------------------------------------------------------------------------
drop trigger if exists trg_goals_updated_at on public.goals;
create trigger trg_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create index if not exists idx_goals_user    on public.goals (user_id);
create index if not exists idx_plans_goal     on public.plans (goal_id);
create index if not exists idx_milestones_plan on public.milestones (plan_id);
create index if not exists idx_tasks_milestone on public.tasks (milestone_id);
create index if not exists idx_tasks_due      on public.tasks (due_at);

-- ---------------------------------------------------------------------------
-- Row Level Security (specs/architecture.md §5, §9)
-- ---------------------------------------------------------------------------
alter table public.goals      enable row level security;
alter table public.plans      enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks      enable row level security;

-- goals: direct ownership
drop policy if exists "goals_owner_select" on public.goals;
create policy "goals_owner_select" on public.goals
  for select using (user_id = auth.uid());

drop policy if exists "goals_owner_insert" on public.goals;
create policy "goals_owner_insert" on public.goals
  for insert with check (user_id = auth.uid());

drop policy if exists "goals_owner_update" on public.goals;
create policy "goals_owner_update" on public.goals
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "goals_owner_delete" on public.goals;
create policy "goals_owner_delete" on public.goals
  for delete using (user_id = auth.uid());

-- plans: ownership inherited through goal
drop policy if exists "plans_owner_all" on public.plans;
create policy "plans_owner_all" on public.plans
  for all
  using (exists (select 1 from public.goals g where g.id = plans.goal_id and g.user_id = auth.uid()))
  with check (exists (select 1 from public.goals g where g.id = plans.goal_id and g.user_id = auth.uid()));

-- milestones: ownership inherited through plan -> goal
drop policy if exists "milestones_owner_all" on public.milestones;
create policy "milestones_owner_all" on public.milestones
  for all
  using (exists (
    select 1 from public.plans p
    join public.goals g on g.id = p.goal_id
    where p.id = milestones.plan_id and g.user_id = auth.uid()))
  with check (exists (
    select 1 from public.plans p
    join public.goals g on g.id = p.goal_id
    where p.id = milestones.plan_id and g.user_id = auth.uid()));

-- tasks: ownership inherited through milestone -> plan -> goal
drop policy if exists "tasks_owner_all" on public.tasks;
create policy "tasks_owner_all" on public.tasks
  for all
  using (exists (
    select 1 from public.milestones m
    join public.plans p on p.id = m.plan_id
    join public.goals g on g.id = p.goal_id
    where m.id = tasks.milestone_id and g.user_id = auth.uid()))
  with check (exists (
    select 1 from public.milestones m
    join public.plans p on p.id = m.plan_id
    join public.goals g on g.id = p.goal_id
    where m.id = tasks.milestone_id and g.user_id = auth.uid()));

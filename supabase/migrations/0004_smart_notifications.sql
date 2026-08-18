-- =============================================================================
-- NEXA Phase 4 — Smart notifications & reminders
-- Creates notification_settings + reminder_schedules (architecture.md §4) and
-- apply_reminder_proposal. Aligns with specs/notifications.md and specs/ai.md §6.
-- =============================================================================

create table if not exists public.notification_settings (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  enabled                 boolean not null default true,
  channels                jsonb not null default '{}'::jsonb,
  quiet_hours             jsonb,
  default_lead_minutes    integer not null default 15 check (default_lead_minutes >= 0),
  allow_ai_suggested_times boolean not null default false,
  push_subscribed         boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table if not exists public.reminder_schedules (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  remind_at    timestamptz not null,
  delivered    boolean not null default false,
  channel      text not null default 'in_app' check (channel in ('in_app','web_notification','push')),
  enabled      boolean not null default true,
  lead_minutes integer check (lead_minutes is null or lead_minutes >= 0),
  created_at   timestamptz not null default now()
);
create index if not exists idx_reminders_user_due on public.reminder_schedules (user_id, remind_at);
create index if not exists idx_reminders_task      on public.reminder_schedules (task_id);

-- ---- Row Level Security (user sees/edits only their own rows) --------------
alter table public.notification_settings enable row level security;
alter table public.reminder_schedules    enable row level security;

drop policy if exists "notification_settings_owner_all" on public.notification_settings;
create policy "notification_settings_owner_all" on public.notification_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "reminders_owner_all" on public.reminder_schedules;
create policy "reminders_owner_all" on public.reminder_schedules
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists trg_notification_settings_updated_at on public.notification_settings;
create trigger trg_notification_settings_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

-- ---- Apply a reminder_time proposal -> create a reminder (atomic) ----------
-- Accepts a pending 'reminder_time' ai_proposal owned by auth.uid(), validates
-- the referenced task belongs to the user, creates an enabled reminder, logs an
-- ai_event, and marks the proposal accepted — in one transaction.
create or replace function public.apply_reminder_proposal(p_proposal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_prop       record;
  v_task_id    uuid;
  v_remind_at  timestamptz;
  v_reminder_id uuid;
  v_goal_id    uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_prop from public.ai_proposals
    where id = p_proposal_id and user_id = v_user_id and kind = 'reminder_time' and status = 'pending';
  if not found then
    raise exception 'Reminder proposal not found or already handled' using errcode = 'P0002';
  end if;

  v_task_id   := (v_prop.payload->>'task_id')::uuid;
  v_remind_at := (v_prop.payload->>'remind_at')::timestamptz;

  select g.id into v_goal_id
    from public.tasks t
    join public.milestones m on m.id = t.milestone_id
    join public.plans p on p.id = m.plan_id
    join public.goals g on g.id = p.goal_id
    where t.id = v_task_id and g.user_id = v_user_id;
  if v_goal_id is null then
    raise exception 'Task is not owned by the user' using errcode = '42501';
  end if;

  insert into public.reminder_schedules (task_id, user_id, remind_at, enabled, channel)
    values (v_task_id, v_user_id, v_remind_at, true, 'in_app')
    returning id into v_reminder_id;

  insert into public.ai_events (user_id, goal_id, type, summary, rationale, accepted, payload)
    values (
      v_user_id, v_goal_id, 'reminder_time',
      left(coalesce(v_prop.rationale, 'Reminder scheduled'), 200),
      v_prop.rationale, true, v_prop.payload
    );

  update public.ai_proposals set status = 'accepted', applied_at = now() where id = p_proposal_id;

  return jsonb_build_object('ok', true, 'reminder_id', v_reminder_id);
end;
$$;

revoke execute on function public.apply_reminder_proposal(uuid) from anon, public;
grant execute on function public.apply_reminder_proposal(uuid) to authenticated;

-- =============================================================================
-- NEXA Phase 3 — Adaptive replanning
-- Adds: 'postponed' task status + status_reason, and the ai_proposals/ai_events
-- tables (architecture.md §4) that implement the propose/apply boundary for
-- replanning. Aligns with specs/ai.md §3.4 / §6 / §7.
-- =============================================================================

-- ---- 'postponed' status + reason on tasks ----------------------------------
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('todo','in_progress','done','missed','skipped','postponed'));

alter table public.tasks add column if not exists status_reason text;

-- ---- ai_proposals (the propose/apply mechanism) ----------------------------
create table if not exists public.ai_proposals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  goal_id    uuid not null references public.goals(id) on delete cascade,
  kind       text not null check (kind in ('plan','recovery','next_action','reminder_time','replan')),
  payload    jsonb not null,
  rationale  text,
  status     text not null default 'pending' check (status in ('pending','accepted','rejected')),
  applied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_proposals_user_goal on public.ai_proposals (user_id, goal_id);
create index if not exists idx_ai_proposals_pending on public.ai_proposals (status) where status = 'pending';

-- ---- ai_events (transparency / history log) --------------------------------
create table if not exists public.ai_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  goal_id    uuid not null references public.goals(id) on delete cascade,
  type       text not null,
  summary    text,
  rationale  text,
  accepted   boolean not null default false,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_ai_events_user_goal on public.ai_events (user_id, goal_id);

-- ---- Row Level Security ----------------------------------------------------
alter table public.ai_proposals enable row level security;
alter table public.ai_events    enable row level security;

drop policy if exists "ai_proposals_owner_all" on public.ai_proposals;
create policy "ai_proposals_owner_all" on public.ai_proposals
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "ai_events_owner_select" on public.ai_events;
create policy "ai_events_owner_select" on public.ai_events
  for select using (user_id = auth.uid());

-- ---- Apply a replan proposal atomically ------------------------------------
-- Reads a pending 'replan' proposal owned by auth.uid(), applies its change set
-- (reschedule / reprioritize / add_task — NEVER deletes, NEVER changes the goal
-- deadline), captures the before-state into ai_events (history), and marks the
-- proposal accepted. All in one transaction; any error rolls everything back.
--
-- SECURITY: the proposal payload is user-editable via RLS, so it is UNTRUSTED.
-- Every referenced task/milestone is verified to belong to the caller's goal
-- before any write. A tampered payload referencing another user's data raises
-- and aborts the whole transaction.
create or replace function public.apply_replan(p_proposal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_prop     record;
  v_goal_id  uuid;
  v_changes  jsonb;
  v_change   jsonb;
  v_history  jsonb := '[]'::jsonb;
  v_before   jsonb;
  v_task_id  uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_prop from public.ai_proposals
    where id = p_proposal_id and user_id = v_user_id and kind = 'replan' and status = 'pending';
  if not found then
    raise exception 'Replan proposal not found or already handled' using errcode = 'P0002';
  end if;

  v_goal_id := v_prop.goal_id;
  v_changes := coalesce(v_prop.payload->'changes', '[]'::jsonb);

  -- SECURITY validation: confirm ownership of every referenced entity.
  for v_change in select * from jsonb_array_elements(v_changes) loop
    if v_change->>'type' in ('reschedule','reprioritize') then
      v_task_id := (v_change->>'task_id')::uuid;
      if not exists (
        select 1 from public.tasks t
        join public.milestones m on m.id = t.milestone_id
        join public.plans p on p.id = m.plan_id
        join public.goals g on g.id = p.goal_id
        where t.id = v_task_id and g.user_id = v_user_id and p.goal_id = v_goal_id
      ) then
        raise exception 'Task % is not part of this goal', v_task_id using errcode = '42501';
      end if;
    elseif v_change->>'type' = 'add_task' then
      if not exists (
        select 1 from public.milestones m
        join public.plans p on p.id = m.plan_id
        join public.goals g on g.id = p.goal_id
        where m.id = (v_change->>'milestone_id')::uuid and g.user_id = v_user_id and p.goal_id = v_goal_id
      ) then
        raise exception 'Milestone is not part of this goal' using errcode = '42501';
      end if;
    end if;
  end loop;

  -- Apply (now ownership-verified) and capture before-state for history.
  for v_change in select * from jsonb_array_elements(v_changes) loop
    if v_change->>'type' = 'reschedule' then
      v_task_id := (v_change->>'task_id')::uuid;
      select jsonb_build_object('task_id', t.id, 'field', 'due_at', 'old', t.due_at, 'new', v_change->>'due_at')
        into v_before from public.tasks t where t.id = v_task_id;
      v_history := v_history || jsonb_build_array(v_before);
      update public.tasks
        set due_at = nullif(v_change->>'due_at', '')::timestamptz
        where id = v_task_id;

    elseif v_change->>'type' = 'reprioritize' then
      v_task_id := (v_change->>'task_id')::uuid;
      select jsonb_build_object('task_id', t.id, 'field', 'priority', 'old', t.priority, 'new', v_change->>'priority')
        into v_before from public.tasks t where t.id = v_task_id;
      v_history := v_history || jsonb_build_array(v_before);
      update public.tasks
        set priority = v_change->>'priority'
        where id = v_task_id and v_change->>'priority' in ('low','medium','high');

    elseif v_change->>'type' = 'add_task' then
      insert into public.tasks (milestone_id, title, description, estimated_minutes, due_at, status, priority, order_index)
        values (
          (v_change->>'milestone_id')::uuid,
          v_change->>'title',
          v_change->>'description',
          nullif(v_change->>'estimated_minutes', '')::int,
          nullif(v_change->>'due_at', '')::timestamptz,
          'todo',
          coalesce(nullif(v_change->>'priority', ''), 'medium'),
          coalesce((v_change->>'order_index')::int, 0)
        );
    end if;
  end loop;

  insert into public.ai_events (user_id, goal_id, type, summary, rationale, accepted, payload)
    values (
      v_user_id, v_goal_id, 'replan',
      left(coalesce(v_prop.rationale, 'Replan applied'), 200),
      v_prop.rationale, true,
      jsonb_build_object('before', v_history, 'changes', v_changes)
    );

  update public.ai_proposals
    set status = 'accepted', applied_at = now()
    where id = p_proposal_id;

  return jsonb_build_object('ok', true, 'proposal_id', p_proposal_id, 'history_entries', jsonb_array_length(v_history));
end;
$$;

revoke execute on function public.apply_replan(uuid) from anon, public;
grant execute on function public.apply_replan(uuid) to authenticated;

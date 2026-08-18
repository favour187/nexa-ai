-- =============================================================================
-- NEXA Phase 2 — Featherless AI goal planning
-- Additive schema changes + transactional plan persistence.
-- Aligns with specs/architecture.md §4 (updated) and specs/ai.md.
-- =============================================================================

-- ---- Phase 2 columns -------------------------------------------------------
alter table public.goals add column if not exists constraints text;
alter table public.plans add column if not exists strategy text;
alter table public.plans add column if not exists rationale text;
alter table public.tasks add column if not exists priority text not null default 'medium' check (priority in ('low','medium','high'));
alter table public.tasks add column if not exists order_index integer not null default 0;

create index if not exists idx_tasks_order on public.tasks (milestone_id, order_index);

-- ---- Transactional goal + plan creation ------------------------------------
-- Creates a goal, a DRAFT plan, its milestones and tasks in a single atomic
-- transaction. SECURITY DEFINER so it can insert across tables; it validates
-- auth.uid() so a user can only create their own data. Invalid AI output is
-- rejected BEFORE this runs, so a partial plan can never be written.
create or replace function public.create_goal_with_plan(
  p_title text,
  p_description text,
  p_priority text,
  p_target_deadline timestamptz,
  p_constraints text,
  p_strategy text,
  p_rationale text,
  p_milestones jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := auth.uid();
  v_goal_id   uuid;
  v_plan_id   uuid;
  v_milestone_id uuid;
  v_milestone jsonb;
  v_task      jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_title is null or btrim(p_title) = '' then
    raise exception 'Title is required' using errcode = '23502';
  end if;
  if p_priority is null or p_priority not in ('low','medium','high') then
    raise exception 'Invalid priority' using errcode = '23514';
  end if;

  insert into public.goals (user_id, title, description, priority, target_deadline, constraints)
    values (v_user_id, p_title, p_description, p_priority, p_target_deadline, p_constraints)
    returning id into v_goal_id;

  insert into public.plans (goal_id, version, status, source, strategy, rationale)
    values (v_goal_id, 1, 'draft', 'generated', p_strategy, p_rationale)
    returning id into v_plan_id;

  for v_milestone in select * from jsonb_array_elements(p_milestones) loop
    insert into public.milestones (plan_id, title, order_index, target_date, status)
      values (
        v_plan_id,
        v_milestone->>'title',
        coalesce((v_milestone->>'order_index')::int, 0),
        nullif(v_milestone->>'target_date', '')::date,
        'todo'
      )
      returning id into v_milestone_id;

    for v_task in select * from jsonb_array_elements(coalesce(v_milestone->'tasks', '[]'::jsonb)) loop
      insert into public.tasks (milestone_id, title, description, estimated_minutes, due_at, status, order_index, priority)
        values (
          v_milestone_id,
          v_task->>'title',
          v_task->>'description',
          nullif(v_task->>'estimated_minutes', '')::int,
          nullif(v_task->>'due_at', '')::timestamptz,
          'todo',
          coalesce((v_task->>'order')::int, 0),
          coalesce(nullif(v_task->>'priority', ''), 'medium')
        );
    end loop;
  end loop;

  return jsonb_build_object('goal_id', v_goal_id, 'plan_id', v_plan_id);
end;
$$;

-- Only authenticated users may call it.
revoke execute on function public.create_goal_with_plan(text, text, text, timestamptz, text, text, text, jsonb) from anon, public;
grant execute on function public.create_goal_with_plan(text, text, text, timestamptz, text, text, text, jsonb) to authenticated;

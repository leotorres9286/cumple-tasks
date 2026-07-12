-- Materializes daily task occurrences and exposes read helpers for the board
-- and the reward leaderboard. All functions are SECURITY DEFINER so a
-- non-admin can trigger occurrence creation and read the profiles of the
-- collaborators involved in the tasks they can see, without relaxing the
-- table-level RLS policies.

-- Ensures a task_occurrence row exists for every active template whose
-- recurrence matches target_date and whose validity window covers it.
-- Idempotent: safe to call on every page load.
create or replace function public.ensure_occurrences_for_date(target_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_weekday public.weekday := case extract(isodow from target_date)::int
    when 1 then 'lunes'::public.weekday
    when 2 then 'martes'::public.weekday
    when 3 then 'miercoles'::public.weekday
    when 4 then 'jueves'::public.weekday
    when 5 then 'viernes'::public.weekday
    when 6 then 'sabado'::public.weekday
    when 7 then 'domingo'::public.weekday
  end;
  target_month_day int := extract(day from target_date)::int;
begin
  insert into public.task_occurrences (task_template_id, scheduled_for)
  select tt.id, target_date
  from public.task_templates tt
  where tt.active
    and tt.valid_from::date <= target_date
    and (tt.valid_until is null or tt.valid_until::date >= target_date)
    and (
      tt.recurrence_kind = 'diaria'
      or (tt.recurrence_kind = 'semanal' and target_weekday = any(tt.recurrence_weekdays))
      or (tt.recurrence_kind = 'mensual' and tt.recurrence_month_day = target_month_day)
    )
  on conflict (task_template_id, scheduled_for) do nothing;
end;
$$;

grant execute on function public.ensure_occurrences_for_date(date) to authenticated;

-- Shapes a profile row into the camelCase JSON the client expects.
create or replace function public.profile_json(p public.profiles)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'fullName', p.full_name,
    'initials', p.initials,
    'role', p.role,
    'avatarColor', p.avatar_color,
    'createdAt', p.created_at,
    'updatedAt', p.updated_at
  );
$$;

-- Returns the board (TaskWithRelations[]) for target_date, limited to the
-- occurrences the caller is involved in (admin, supervisor or responsible).
create or replace function public.tasks_for_date(target_date date)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'template', jsonb_build_object(
          'id', tt.id,
          'name', tt.name,
          'description', tt.description,
          'kind', tt.kind,
          'timeWindow', jsonb_build_object(
            'startTime', to_char(tt.time_start, 'HH24:MI'),
            'endTime', to_char(tt.time_end, 'HH24:MI')
          ),
          'recurrence', jsonb_build_object(
            'kind', tt.recurrence_kind,
            'weekdays', to_jsonb(tt.recurrence_weekdays),
            'monthDay', tt.recurrence_month_day
          ),
          'validFrom', tt.valid_from,
          'validUntil', tt.valid_until,
          'rewardPoints', tt.reward_points,
          'supervisorId', tt.supervisor_id,
          'createdBy', tt.created_by,
          'active', tt.active,
          'createdAt', tt.created_at,
          'updatedAt', tt.updated_at
        ),
        'occurrence', jsonb_build_object(
          'id', occ.id,
          'taskTemplateId', occ.task_template_id,
          'scheduledFor', occ.scheduled_for,
          'status', occ.status,
          'completedBy', occ.completed_by,
          'completedAt', occ.completed_at,
          'verifiedBy', occ.verified_by,
          'verifiedAt', occ.verified_at,
          'scoreValue', occ.score_value,
          'createdAt', occ.created_at,
          'updatedAt', occ.updated_at
        ),
        'supervisor', public.profile_json(sup),
        'responsibles', coalesce((
          select jsonb_agg(public.profile_json(rp) order by rp.full_name)
          from public.task_assignments ta
          join public.profiles rp on rp.id = ta.responsible_id
          where ta.task_template_id = tt.id
        ), '[]'::jsonb),
        'notes', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', n.id,
              'taskTemplateId', n.task_template_id,
              'taskOccurrenceId', n.task_occurrence_id,
              'authorId', n.author_id,
              'kind', n.kind,
              'body', n.body,
              'createdAt', n.created_at
            )
            order by n.created_at
          )
          from public.task_notes n
          where n.task_template_id = tt.id or n.task_occurrence_id = occ.id
        ), '[]'::jsonb)
      )
      order by tt.time_start, tt.name
    ),
    '[]'::jsonb
  )
  from public.task_occurrences occ
  join public.task_templates tt on tt.id = occ.task_template_id
  join public.profiles sup on sup.id = tt.supervisor_id
  where occ.scheduled_for = target_date
    and (
      public.is_admin()
      or public.is_supervisor_for_template(tt.id)
      or public.is_responsible_for_template(tt.id)
    );
$$;

grant execute on function public.tasks_for_date(date) to authenticated;

-- Verified reward points per responsible, bucketed by day/week/month.
-- Points are credited to every responsible of a verified occurrence.
create or replace function public.reward_totals()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with credits as (
    select
      ta.responsible_id as profile_id,
      tt.reward_points as points,
      coalesce(occ.verified_at::date, occ.scheduled_for) as earned_date
    from public.task_occurrences occ
    join public.task_templates tt on tt.id = occ.task_template_id
    join public.task_assignments ta on ta.task_template_id = tt.id
    where occ.status = 'verificada'
  ),
  totals as (
    select
      p.id,
      p.full_name,
      p.initials,
      coalesce(sum(c.points) filter (
        where c.earned_date = current_date
      ), 0) as daily,
      coalesce(sum(c.points) filter (
        where date_trunc('week', c.earned_date::timestamp)
          = date_trunc('week', current_date::timestamp)
      ), 0) as weekly,
      coalesce(sum(c.points) filter (
        where date_trunc('month', c.earned_date::timestamp)
          = date_trunc('month', current_date::timestamp)
      ), 0) as monthly
    from public.profiles p
    join (select distinct responsible_id from public.task_assignments) e
      on e.responsible_id = p.id
    left join credits c on c.profile_id = p.id
    group by p.id, p.full_name, p.initials
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'profileId', id,
        'profileName', full_name,
        'initials', initials,
        'daily', daily,
        'weekly', weekly,
        'monthly', monthly
      )
      order by full_name
    ),
    '[]'::jsonb
  )
  from totals;
$$;

grant execute on function public.reward_totals() to authenticated;

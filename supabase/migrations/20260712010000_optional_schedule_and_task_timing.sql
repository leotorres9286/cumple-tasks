-- Optional compliance schedule + explicit task timing.
--
-- 1) A task template's time window (time_start/time_end) is now optional. It is
--    only mandatory when the admin enables a specific compliance schedule; when
--    disabled both columns are null. "Has a schedule" is derived from the times
--    being present, so no extra flag column is needed.
-- 2) Occurrences now record when the responsible STARTED the work
--    (started_by/started_at), in addition to the existing completion
--    (completed_by/completed_at) and verification timestamps.

-- --- Optional time window ------------------------------------------------

alter table public.task_templates
  alter column time_start drop not null,
  alter column time_end drop not null;

-- The old constraint required both times and start < end. Replace it so that
-- an absent schedule is allowed, while a present one is still validated.
alter table public.task_templates
  drop constraint valid_time_window;

alter table public.task_templates
  add constraint valid_time_window check (
    time_start is null
    or time_end is null
    or time_start < time_end
  );

-- Both times are present together or absent together (no half-defined window).
alter table public.task_templates
  add constraint schedule_pair check (
    (time_start is null) = (time_end is null)
  );

-- --- Task start timing ---------------------------------------------------

alter table public.task_occurrences
  add column started_by uuid references public.profiles(id),
  add column started_at timestamptz;

-- Allow the responsible to stamp themselves as the starter, mirroring the
-- existing completed_by rule.
drop policy "task_occurrences_responsible_update" on public.task_occurrences;

create policy "task_occurrences_responsible_update"
on public.task_occurrences
for update
to authenticated
using (
  public.is_responsible_for_template(task_template_id)
  and status in ('creada', 'iniciada', 'en_proceso', 'incorrecta')
)
with check (
  public.is_responsible_for_template(task_template_id)
  and status in ('iniciada', 'en_proceso', 'finalizada')
  and (completed_by is null or completed_by = auth.uid())
  and (started_by is null or started_by = auth.uid())
);

-- --- Board reader: expose start timing and tolerate null windows ---------

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
          'startedBy', occ.started_by,
          'startedAt', occ.started_at,
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
      order by tt.time_start nulls last, tt.name
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

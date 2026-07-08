create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'supervisor', 'responsable');
create type public.task_kind as enum ('accion', 'puntuacion');
create type public.task_status as enum (
  'creada',
  'iniciada',
  'en_proceso',
  'finalizada',
  'incorrecta',
  'verificada'
);
create type public.recurrence_kind as enum ('diaria', 'semanal', 'mensual');
create type public.weekday as enum (
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo'
);
create type public.note_kind as enum (
  'nota_interna',
  'comentario_responsable',
  'feedback_supervisor'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  initials text not null,
  role public.user_role not null default 'responsable',
  avatar_color text not null default '#3e6b4f',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  kind public.task_kind not null default 'accion',
  time_start time not null,
  time_end time not null,
  recurrence_kind public.recurrence_kind not null default 'diaria',
  recurrence_weekdays public.weekday[] not null default '{}',
  recurrence_month_day smallint,
  valid_from timestamptz not null,
  valid_until timestamptz,
  reward_points integer not null default 0 check (reward_points >= 0),
  supervisor_id uuid not null references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_time_window check (time_start < time_end),
  constraint valid_month_day check (
    recurrence_kind <> 'mensual'
    or recurrence_month_day between 1 and 31
  ),
  constraint valid_weekdays check (
    recurrence_kind <> 'semanal'
    or cardinality(recurrence_weekdays) > 0
  )
);

create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_template_id uuid not null references public.task_templates(id) on delete cascade,
  responsible_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_template_id, responsible_id)
);

create table public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  task_template_id uuid not null references public.task_templates(id) on delete cascade,
  scheduled_for date not null,
  status public.task_status not null default 'creada',
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  score_value numeric(6, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_template_id, scheduled_for)
);

create table public.task_notes (
  id uuid primary key default gen_random_uuid(),
  task_template_id uuid references public.task_templates(id) on delete cascade,
  task_occurrence_id uuid references public.task_occurrences(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind public.note_kind not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint note_target_required check (
    task_template_id is not null
    or task_occurrence_id is not null
  )
);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  task_occurrence_id uuid not null references public.task_occurrences(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index task_templates_supervisor_id_idx on public.task_templates(supervisor_id);
create index task_assignments_responsible_id_idx on public.task_assignments(responsible_id);
create index task_occurrences_status_idx on public.task_occurrences(status);
create index task_occurrences_scheduled_for_idx on public.task_occurrences(scheduled_for);
create index task_notes_occurrence_idx on public.task_notes(task_occurrence_id);
create index notification_events_recipient_idx on public.notification_events(recipient_id, read_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger task_templates_set_updated_at
before update on public.task_templates
for each row execute function public.set_updated_at();

create trigger task_occurrences_set_updated_at
before update on public.task_occurrences
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_name text;
begin
  metadata_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, email, full_name, initials, role)
  values (
    new.id,
    new.email,
    metadata_name,
    upper(left(metadata_name, 1)),
    'responsable'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.is_supervisor_for_template(template_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_templates tt
    where tt.id = template_id
      and tt.supervisor_id = auth.uid()
  )
$$;

create or replace function public.is_responsible_for_template(template_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_assignments ta
    where ta.task_template_id = template_id
      and ta.responsible_id = auth.uid()
  )
$$;

create or replace function public.notify_supervisor_on_occurrence_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  template_record public.task_templates;
  actor_name text;
begin
  select * into template_record
  from public.task_templates
  where id = new.task_template_id;

  select full_name into actor_name
  from public.profiles
  where id = auth.uid();

  if template_record.supervisor_id is not null
     and auth.uid() is not null
     and auth.uid() <> template_record.supervisor_id then
    insert into public.notification_events (
      task_occurrence_id,
      recipient_id,
      actor_id,
      message
    )
    values (
      new.id,
      template_record.supervisor_id,
      auth.uid(),
      coalesce(actor_name, 'Un responsable') || ' actualizo "' || template_record.name || '".'
    );
  end if;

  return new;
end;
$$;

create trigger task_occurrences_notify_supervisor
after update on public.task_occurrences
for each row
when (old.* is distinct from new.*)
execute function public.notify_supervisor_on_occurrence_change();

alter table public.profiles enable row level security;
alter table public.task_templates enable row level security;
alter table public.task_assignments enable row level security;
alter table public.task_occurrences enable row level security;
alter table public.task_notes enable row level security;
alter table public.notification_events enable row level security;

create policy "profiles_select_visible"
on public.profiles
for select
to authenticated
using (
  public.is_admin()
  or id = auth.uid()
  or exists (
    select 1 from public.task_templates tt
    where tt.supervisor_id = auth.uid()
  )
);

create policy "profiles_admin_write"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "task_templates_select_involved"
on public.task_templates
for select
to authenticated
using (
  public.is_admin()
  or supervisor_id = auth.uid()
  or public.is_responsible_for_template(id)
);

create policy "task_templates_admin_write"
on public.task_templates
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "task_assignments_select_involved"
on public.task_assignments
for select
to authenticated
using (
  public.is_admin()
  or responsible_id = auth.uid()
  or public.is_supervisor_for_template(task_template_id)
);

create policy "task_assignments_admin_write"
on public.task_assignments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "task_occurrences_select_involved"
on public.task_occurrences
for select
to authenticated
using (
  public.is_admin()
  or public.is_supervisor_for_template(task_template_id)
  or public.is_responsible_for_template(task_template_id)
);

create policy "task_occurrences_admin_write"
on public.task_occurrences
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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
);

create policy "task_occurrences_supervisor_verify"
on public.task_occurrences
for update
to authenticated
using (
  public.is_supervisor_for_template(task_template_id)
  and status = 'finalizada'
)
with check (
  public.is_supervisor_for_template(task_template_id)
  and status in ('incorrecta', 'verificada')
  and verified_by = auth.uid()
);

create policy "task_notes_select_involved"
on public.task_notes
for select
to authenticated
using (
  public.is_admin()
  or (
    task_template_id is not null
    and (
      public.is_supervisor_for_template(task_template_id)
      or public.is_responsible_for_template(task_template_id)
    )
  )
  or (
    task_occurrence_id is not null
    and exists (
      select 1 from public.task_occurrences occ
      where occ.id = task_occurrence_id
        and (
          public.is_supervisor_for_template(occ.task_template_id)
          or public.is_responsible_for_template(occ.task_template_id)
        )
    )
  )
);

create policy "task_notes_insert_involved"
on public.task_notes
for insert
to authenticated
with check (
  author_id = auth.uid()
  and (
    public.is_admin()
    or (
      task_template_id is not null
      and (
        public.is_supervisor_for_template(task_template_id)
        or public.is_responsible_for_template(task_template_id)
      )
    )
    or (
      task_occurrence_id is not null
      and exists (
        select 1 from public.task_occurrences occ
        where occ.id = task_occurrence_id
          and (
            public.is_supervisor_for_template(occ.task_template_id)
            or public.is_responsible_for_template(occ.task_template_id)
          )
      )
    )
  )
);

create policy "notification_events_select_own"
on public.notification_events
for select
to authenticated
using (recipient_id = auth.uid() or public.is_admin());

create policy "notification_events_update_own"
on public.notification_events
for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create policy "notification_events_system_insert"
on public.notification_events
for insert
to authenticated
with check (actor_id = auth.uid() or public.is_admin());

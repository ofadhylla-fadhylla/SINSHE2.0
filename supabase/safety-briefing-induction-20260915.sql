-- SINSHE 2.0 Safety Briefing & Induction
-- Applied to Supabase project on 2026-09-15.

create table if not exists public.safety_sessions (
  id text primary key,
  company_code text references public.companies(code) on update cascade on delete restrict,
  session_type text not null check (session_type in ('Safety Briefing','Safety Induction')),
  title text not null,
  session_date date not null,
  start_time time,
  end_time time,
  unit text not null,
  location text not null default '',
  facilitator text not null default '',
  topic text,
  material_ref text,
  status text not null default 'Scheduled' check (status in ('Scheduled','In Progress','Completed','Cancelled')),
  quiz_required boolean not null default false,
  passing_score integer not null default 70 check (passing_score between 0 and 100),
  acknowledgement_required boolean not null default true,
  qr_token text,
  planned_participants integer not null default 0 check (planned_participants >= 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists safety_sessions_company_date_idx on public.safety_sessions(company_code, session_date desc);
create index if not exists safety_sessions_unit_status_idx on public.safety_sessions(unit, status);
alter table public.safety_sessions enable row level security;

drop policy if exists safety_sessions_select on public.safety_sessions;
create policy safety_sessions_select on public.safety_sessions for select using (public.can_view_unit(unit));
drop policy if exists safety_sessions_insert on public.safety_sessions;
create policy safety_sessions_insert on public.safety_sessions for insert with check (public.can_manage_unit(unit));
drop policy if exists safety_sessions_update on public.safety_sessions;
create policy safety_sessions_update on public.safety_sessions for update using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
drop policy if exists safety_sessions_delete on public.safety_sessions;
create policy safety_sessions_delete on public.safety_sessions for delete using (public.current_role() = 'Admin');

drop trigger if exists safety_sessions_set_updated_at on public.safety_sessions;
create trigger safety_sessions_set_updated_at before update on public.safety_sessions for each row execute function public.set_updated_at();

create table if not exists public.safety_attendance (
  id text primary key,
  session_id text not null references public.safety_sessions(id) on update cascade on delete cascade,
  company_code text references public.companies(code) on update cascade on delete restrict,
  employee_name text not null,
  employee_id text,
  unit text not null,
  attendance_status text not null default 'Present' check (attendance_status in ('Present','Absent','Excused')),
  check_in_at timestamptz,
  quiz_score integer check (quiz_score between 0 and 100),
  acknowledgement boolean not null default false,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists safety_attendance_session_idx on public.safety_attendance(session_id);
create index if not exists safety_attendance_company_idx on public.safety_attendance(company_code);
alter table public.safety_attendance enable row level security;

drop policy if exists safety_attendance_select on public.safety_attendance;
create policy safety_attendance_select on public.safety_attendance for select using (public.can_view_unit(unit));
drop policy if exists safety_attendance_insert on public.safety_attendance;
create policy safety_attendance_insert on public.safety_attendance for insert with check (public.can_manage_unit(unit));
drop policy if exists safety_attendance_update on public.safety_attendance;
create policy safety_attendance_update on public.safety_attendance for update using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
drop policy if exists safety_attendance_delete on public.safety_attendance;
create policy safety_attendance_delete on public.safety_attendance for delete using (public.current_role() = 'Admin');

drop trigger if exists safety_attendance_set_updated_at on public.safety_attendance;
create trigger safety_attendance_set_updated_at before update on public.safety_attendance for each row execute function public.set_updated_at();

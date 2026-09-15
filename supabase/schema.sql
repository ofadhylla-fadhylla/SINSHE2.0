-- SINSHE 2.0 - Supabase foundation schema
-- Run this in the Supabase SQL editor for the project connected to SINSHE 2.0.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  position text,
  unit text not null default 'Head Office',
  role text not null default 'Viewer' check (role in ('Admin','Manager','Editor','Contributor','Viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, position, unit, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'position', ''),
    coalesce(new.raw_user_meta_data ->> 'unit', 'Head Office'),
    case
      when coalesce(new.raw_user_meta_data ->> 'role', 'Viewer') in ('Admin','Manager','Editor','Contributor','Viewer')
        then coalesce(new.raw_user_meta_data ->> 'role', 'Viewer')
      else 'Viewer'
    end,
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid() and active = true), 'Viewer');
$$;

create or replace function public.current_unit()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select unit from public.profiles where id = auth.uid() and active = true), '');
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and active = true);
$$;

create or replace function public.can_view_unit(target_unit text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_user() and (
    public.current_role() in ('Admin','Manager')
    or public.current_unit() = target_unit
  );
$$;

create or replace function public.can_manage_unit(target_unit text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_user() and (
    public.current_role() in ('Admin','Manager')
    or (public.current_role() in ('Editor','Contributor') and public.current_unit() = target_unit)
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_self_or_management" on public.profiles;
create policy "profiles_read_self_or_management"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.current_role() in ('Admin','Manager'));

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles for update
to authenticated
using (public.current_role() = 'Admin')
with check (public.current_role() = 'Admin');

create table if not exists public.observations (
  id text primary key,
  observation_date date not null,
  observation_type text not null,
  description text not null,
  unit text not null,
  location text not null,
  risk text not null,
  status text not null default 'Open',
  pic text,
  due_date date,
  action text,
  evidence text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.corrective_actions (
  id text primary key,
  source text,
  source_id text,
  title text not null,
  unit text not null,
  location text,
  category text,
  priority text,
  pic text,
  due_date date,
  status text not null default 'Open',
  progress integer not null default 0 check (progress between 0 and 100),
  evidence text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id text primary key,
  incident_date date not null,
  incident_time time,
  incident_type text not null,
  severity text not null,
  description text not null,
  unit text not null,
  location text,
  reporter text,
  investigator text,
  status text not null default 'Reported',
  immediate_action text,
  root_cause text,
  corrective_action text,
  due_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permits (
  id text primary key,
  permit_type text not null,
  title text not null,
  unit text not null,
  area text not null,
  requester text,
  contractor text,
  supervisor text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  risk text not null,
  status text not null default 'Draft',
  jsa_no text,
  description text,
  controls jsonb not null default '{}'::jsonb,
  approval text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assets (
  id text primary key,
  name text not null,
  category text not null,
  unit text not null,
  operational text not null default 'Active',
  monitoring text not null default 'Online',
  manufacture_year integer,
  manufacturer text,
  capacity text,
  working_pressure text,
  riksa_due date,
  sio_due date,
  silo_due date,
  calibration_due date,
  serial text,
  owner text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.regulatory_obligations (
  id text primary key,
  regulation text not null,
  category text not null,
  obligation text not null,
  unit text not null,
  owner text,
  due_date date,
  status text not null default 'Needs Action',
  priority text,
  evidence text,
  reference text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hazards (
  id text primary key,
  title text not null,
  hazard_category text,
  unit text not null,
  location text,
  likelihood integer check (likelihood between 1 and 5),
  severity integer check (severity between 1 and 5),
  risk_level text,
  controls text,
  owner text,
  status text not null default 'Open',
  review_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  module text not null,
  record_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles','observations','corrective_actions','incidents','permits','assets','regulatory_obligations','hazards']
  LOOP
    EXECUTE format('drop trigger if exists %I on public.%I', 'set_' || tbl || '_updated_at', tbl);
    EXECUTE format('create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()', 'set_' || tbl || '_updated_at', tbl);
  END LOOP;
END $$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['observations','corrective_actions','incidents','permits','assets','regulatory_obligations','hazards']
  LOOP
    EXECUTE format('alter table public.%I enable row level security', tbl);
    EXECUTE format('drop policy if exists %I on public.%I', tbl || '_select', tbl);
    EXECUTE format('drop policy if exists %I on public.%I', tbl || '_insert', tbl);
    EXECUTE format('drop policy if exists %I on public.%I', tbl || '_update', tbl);
    EXECUTE format('drop policy if exists %I on public.%I', tbl || '_delete', tbl);

    EXECUTE format('create policy %I on public.%I for select to authenticated using (public.can_view_unit(unit))', tbl || '_select', tbl);
    EXECUTE format('create policy %I on public.%I for insert to authenticated with check (public.can_manage_unit(unit))', tbl || '_insert', tbl);
    EXECUTE format('create policy %I on public.%I for update to authenticated using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit))', tbl || '_update', tbl);
    EXECUTE format('create policy %I on public.%I for delete to authenticated using (public.current_role() = ''Admin'')', tbl || '_delete', tbl);
  END LOOP;
END $$;

alter table public.audit_logs enable row level security;
drop policy if exists "audit_logs_management_read" on public.audit_logs;
create policy "audit_logs_management_read"
on public.audit_logs for select
to authenticated
using (public.current_role() in ('Admin','Manager'));

create index if not exists idx_observations_unit_status on public.observations(unit, status);
create index if not exists idx_corrective_actions_unit_status on public.corrective_actions(unit, status);
create index if not exists idx_incidents_unit_status on public.incidents(unit, status);
create index if not exists idx_permits_unit_status on public.permits(unit, status);
create index if not exists idx_assets_unit_category on public.assets(unit, category);
create index if not exists idx_regulatory_unit_status on public.regulatory_obligations(unit, status);
create index if not exists idx_hazards_unit_status on public.hazards(unit, status);

-- IMPORTANT FIRST-ADMIN STEP
-- 1) Create the first user in Supabase Authentication > Users.
-- 2) Then promote that profile once in the SQL editor, replacing the email below:
-- update public.profiles
-- set role = 'Admin', unit = 'Head Office', full_name = 'SINSHE Administrator', active = true
-- where email = 'admin@your-company.com';

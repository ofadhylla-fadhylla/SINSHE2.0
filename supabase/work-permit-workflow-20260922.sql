-- SINSHE 2.0 - Work Permit workflow extension
-- Applied to production Supabase on 2026-09-22.

alter table public.permits
  add column if not exists contractor_type text not null default 'Internal',
  add column if not exists loto_required boolean not null default false,
  add column if not exists loto_ref text references public.loto_installations(id) on delete set null,
  add column if not exists work_height_m numeric(8,2),
  add column if not exists water_depth_m numeric(8,2),
  add column if not exists weather text,
  add column if not exists visibility text,
  add column if not exists distance_from_shore_m numeric(8,2),
  add column if not exists boat_required boolean not null default false,
  add column if not exists supporting_documents jsonb not null default '[]'::jsonb,
  add column if not exists field_verification jsonb not null default '{}'::jsonb,
  add column if not exists status_reason text,
  add column if not exists submitted_at timestamptz,
  add column if not exists assistant_reviewed_at timestamptz,
  add column if not exists field_verified_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists suspended_at timestamptz,
  add column if not exists closed_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='permits_work_height_nonnegative') then
    alter table public.permits add constraint permits_work_height_nonnegative check (work_height_m is null or work_height_m >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='permits_water_depth_nonnegative') then
    alter table public.permits add constraint permits_water_depth_nonnegative check (water_depth_m is null or water_depth_m >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='permits_distance_shore_nonnegative') then
    alter table public.permits add constraint permits_distance_shore_nonnegative check (distance_from_shore_m is null or distance_from_shore_m >= 0);
  end if;
end $$;

create table if not exists public.permit_events (
  id bigint generated always as identity primary key,
  permit_id text not null references public.permits(id) on delete cascade,
  company_code text references public.companies(code) on update cascade on delete set null,
  unit text not null,
  event_type text not null,
  from_status text,
  to_status text,
  actor text,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists permit_events_permit_created_idx on public.permit_events(permit_id, created_at desc);
create index if not exists permit_events_company_unit_idx on public.permit_events(company_code, unit);
create index if not exists permits_loto_ref_idx on public.permits(loto_ref) where loto_ref is not null;
create index if not exists permits_status_end_idx on public.permits(status, end_at);

alter table public.permit_events enable row level security;
revoke all on table public.permit_events from anon;
grant select, insert on table public.permit_events to authenticated;

do $$ begin create policy permit_events_select on public.permit_events for select to authenticated using (public.can_view_unit(unit)); exception when duplicate_object then null; end $$;
do $$ begin create policy permit_events_insert on public.permit_events for insert to authenticated with check (public.can_manage_unit(unit)); exception when duplicate_object then null; end $$;

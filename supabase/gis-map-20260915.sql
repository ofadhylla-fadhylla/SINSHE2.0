create table if not exists public.gis_points (
  id text primary key,
  company_code text references public.companies(code),
  source_module text not null default 'Manual',
  source_record_id text,
  title text not null,
  point_type text not null default 'Hazard',
  unit text not null default 'Head Office',
  location text,
  latitude numeric(10,7) not null check (latitude between -90 and 90),
  longitude numeric(10,7) not null check (longitude between -180 and 180),
  risk_level text not null default 'Medium',
  status text not null default 'Active',
  owner text,
  observed_date date default current_date,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gis_points_company_idx on public.gis_points(company_code);
create index if not exists gis_points_source_idx on public.gis_points(source_module, source_record_id);
create index if not exists gis_points_status_idx on public.gis_points(status, risk_level);

alter table public.gis_points enable row level security;

drop policy if exists gis_points_select on public.gis_points;
create policy gis_points_select on public.gis_points for select using (can_view_unit(unit));
drop policy if exists gis_points_insert on public.gis_points;
create policy gis_points_insert on public.gis_points for insert with check (can_manage_unit(unit));
drop policy if exists gis_points_update on public.gis_points;
create policy gis_points_update on public.gis_points for update using (can_manage_unit(unit)) with check (can_manage_unit(unit));
drop policy if exists gis_points_delete on public.gis_points;
create policy gis_points_delete on public.gis_points for delete using ("current_role"() = 'Admin');

drop trigger if exists set_gis_points_updated_at on public.gis_points;
create trigger set_gis_points_updated_at before update on public.gis_points for each row execute function public.set_updated_at();

-- SINSHE 2.0 — Man-Hours & HSE Exposure
-- 2026-09-16

create table if not exists public.hse_exposure_hours (
  id text primary key,
  company_code text not null references public.companies(code),
  unit text not null,
  period_month date not null,
  employee_hours numeric(14,2) not null default 0 check (employee_hours >= 0),
  contractor_hours numeric(14,2) not null default 0 check (contractor_hours >= 0),
  employee_headcount integer check (employee_headcount is null or employee_headcount >= 0),
  contractor_headcount integer check (contractor_headcount is null or contractor_headcount >= 0),
  status text not null default 'Draft' check (status in ('Draft','Submitted','Verified')),
  source_ref text,
  verified_by text,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hse_exposure_hours_positive_total check ((employee_hours + contractor_hours) > 0),
  constraint hse_exposure_hours_month_start check (period_month = date_trunc('month', period_month)::date),
  constraint hse_exposure_hours_company_unit_month_key unique (company_code, unit, period_month)
);

create index if not exists hse_exposure_hours_company_period_idx on public.hse_exposure_hours(company_code, period_month desc);
create index if not exists hse_exposure_hours_unit_status_idx on public.hse_exposure_hours(unit, status);

alter table public.hse_exposure_hours enable row level security;

drop policy if exists hse_exposure_hours_select on public.hse_exposure_hours;
create policy hse_exposure_hours_select on public.hse_exposure_hours
for select to authenticated
using (public.can_view_unit(unit));

drop policy if exists hse_exposure_hours_insert on public.hse_exposure_hours;
create policy hse_exposure_hours_insert on public.hse_exposure_hours
for insert to authenticated
with check (public.can_manage_unit(unit));

drop policy if exists hse_exposure_hours_update on public.hse_exposure_hours;
create policy hse_exposure_hours_update on public.hse_exposure_hours
for update to authenticated
using (public.can_manage_unit(unit))
with check (public.can_manage_unit(unit));

drop policy if exists hse_exposure_hours_delete on public.hse_exposure_hours;
create policy hse_exposure_hours_delete on public.hse_exposure_hours
for delete to authenticated
using (public.current_role() = 'Admin');

drop trigger if exists set_hse_exposure_hours_updated_at on public.hse_exposure_hours;
create trigger set_hse_exposure_hours_updated_at
before update on public.hse_exposure_hours
for each row execute function public.set_updated_at();

-- KPN Plantations APD forms digitalization
-- KPNPLT-FORM-SST-003.01 / 003.02 / 003.03 / 003.04 / 003.07
create table if not exists public.ppe_monitoring (
  id text primary key,
  company_code text references public.companies(code),
  unit text not null default 'Unknown',
  form_code text not null default 'KPNPLT-FORM-SST-003.02/003.03',
  job_title text not null,
  work_area text,
  worker_count integer not null default 0 check (worker_count >= 0),
  ppe_type text not null,
  material_code text,
  usage_period text,
  required_qty integer not null default 0 check (required_qty >= 0),
  given_qty integer not null default 0 check (given_qty >= 0),
  shortage_qty integer not null default 0 check (shortage_qty >= 0),
  handover_start date,
  handover_end date,
  replacement_due date,
  next_pr_date date,
  documentation_ref text,
  status text not null default 'Covered' check (status in ('Covered','Shortage','Replacement Due','PR Due Soon','Closed')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ppe_monitoring_company_status_idx on public.ppe_monitoring(company_code,status);
create index if not exists ppe_monitoring_due_idx on public.ppe_monitoring(replacement_due,next_pr_date);
alter table public.ppe_monitoring enable row level security;
create policy ppe_monitoring_select on public.ppe_monitoring for select to authenticated using (public.can_view_unit(unit));
create policy ppe_monitoring_insert on public.ppe_monitoring for insert to authenticated with check (public.can_manage_unit(unit));
create policy ppe_monitoring_update on public.ppe_monitoring for update to authenticated using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
create policy ppe_monitoring_delete on public.ppe_monitoring for delete to authenticated using (public.current_role() = 'Admin');
create trigger ppe_monitoring_set_updated_at before update on public.ppe_monitoring for each row execute function public.set_updated_at();

create table if not exists public.ppe_handover (
  id text primary key,
  company_code text references public.companies(code),
  unit text not null default 'Unknown',
  form_code text not null default 'KPNPLT-FORM-SST-003.04',
  handover_date date not null,
  employee_name text not null,
  nik text,
  job_title text,
  ppe_type text not null,
  qty integer not null default 1 check (qty > 0),
  acknowledgement boolean not null default false,
  handover_ref text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ppe_handover_company_date_idx on public.ppe_handover(company_code,handover_date desc);
alter table public.ppe_handover enable row level security;
create policy ppe_handover_select on public.ppe_handover for select to authenticated using (public.can_view_unit(unit));
create policy ppe_handover_insert on public.ppe_handover for insert to authenticated with check (public.can_manage_unit(unit));
create policy ppe_handover_update on public.ppe_handover for update to authenticated using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
create policy ppe_handover_delete on public.ppe_handover for delete to authenticated using (public.current_role() = 'Admin');
create trigger ppe_handover_set_updated_at before update on public.ppe_handover for each row execute function public.set_updated_at();

create table if not exists public.ppe_pr_monitoring (
  id text primary key,
  company_code text references public.companies(code),
  unit text not null default 'Unknown',
  form_code text not null default 'KPNPLT-FORM-SST-003.07',
  estate text,
  pr_no text not null,
  description text,
  pr_date date,
  sign_em date,
  sign_gem date,
  sign_rh date,
  receive_epd_lo date,
  approval_hp date,
  epd_lo_to_ro date,
  epd_ro_to_purch date,
  po_date date,
  grn_date date,
  status text not null default 'PR Open' check (status in ('PR Open','Approval','Purchasing','PO Issued','GRN Complete','Cancelled')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ppe_pr_company_status_idx on public.ppe_pr_monitoring(company_code,status);
create index if not exists ppe_pr_dates_idx on public.ppe_pr_monitoring(pr_date,grn_date);
alter table public.ppe_pr_monitoring enable row level security;
create policy ppe_pr_select on public.ppe_pr_monitoring for select to authenticated using (public.can_view_unit(unit));
create policy ppe_pr_insert on public.ppe_pr_monitoring for insert to authenticated with check (public.can_manage_unit(unit));
create policy ppe_pr_update on public.ppe_pr_monitoring for update to authenticated using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
create policy ppe_pr_delete on public.ppe_pr_monitoring for delete to authenticated using (public.current_role() = 'Admin');
create trigger ppe_pr_set_updated_at before update on public.ppe_pr_monitoring for each row execute function public.set_updated_at();

-- Contractor HSE Management foundation
-- SINSHE 2.0 / KPN Plantations

create table if not exists public.contractors (
  id text primary key,
  company_code text references public.companies(code),
  vendor_name text not null,
  contract_no text,
  work_scope text,
  unit text not null default 'Head Office',
  contact_person text,
  hse_pic text,
  risk_class text not null default 'Medium' check (risk_class in ('Low','Medium','High','Critical')),
  status text not null default 'Prequalified' check (status in ('Prequalified','Active','Suspended','Expired','Closed')),
  start_date date,
  end_date date,
  prequalification_score numeric check (prequalification_score is null or (prequalification_score >= 0 and prequalification_score <= 100)),
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contractors_company_status_idx on public.contractors(company_code,status);
create index if not exists contractors_vendor_idx on public.contractors(vendor_name);

alter table public.contractors enable row level security;
create policy "contractors_select" on public.contractors for select using (public.can_view_unit(unit));
create policy "contractors_insert" on public.contractors for insert with check (public.can_manage_unit(unit));
create policy "contractors_update" on public.contractors for update using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
create policy "contractors_delete_admin" on public.contractors for delete using (public.current_role() = 'Admin');

create trigger contractors_set_updated_at before update on public.contractors
for each row execute function public.set_updated_at();

create table if not exists public.contractor_workers (
  id text primary key,
  contractor_id text not null references public.contractors(id) on delete cascade,
  company_code text references public.companies(code),
  worker_name text not null,
  worker_no text,
  role text,
  unit text not null default 'Head Office',
  induction_date date,
  induction_valid_until date,
  medical_valid_until date,
  competency_name text,
  competency_valid_until date,
  status text not null default 'Active' check (status in ('Active','Restricted','Inactive')),
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contractor_workers_contractor_idx on public.contractor_workers(contractor_id);
create index if not exists contractor_workers_company_idx on public.contractor_workers(company_code,unit);

alter table public.contractor_workers enable row level security;
create policy "contractor_workers_select" on public.contractor_workers for select using (public.can_view_unit(unit));
create policy "contractor_workers_insert" on public.contractor_workers for insert with check (public.can_manage_unit(unit));
create policy "contractor_workers_update" on public.contractor_workers for update using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
create policy "contractor_workers_delete_admin" on public.contractor_workers for delete using (public.current_role() = 'Admin');

create trigger contractor_workers_set_updated_at before update on public.contractor_workers
for each row execute function public.set_updated_at();

create table if not exists public.contractor_hse_events (
  id text primary key,
  contractor_id text not null references public.contractors(id) on delete cascade,
  company_code text references public.companies(code),
  unit text not null default 'Head Office',
  event_date date not null default current_date,
  event_type text not null check (event_type in ('Incident','Audit Finding','HSE Violation','Positive Observation','Other')),
  severity text not null default 'Medium' check (severity in ('Low','Medium','High','Critical')),
  title text not null,
  description text,
  source_record_id text,
  status text not null default 'Open' check (status in ('Open','Monitoring','Closed')),
  due_date date,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contractor_hse_events_contractor_idx on public.contractor_hse_events(contractor_id,event_date desc);
create index if not exists contractor_hse_events_company_status_idx on public.contractor_hse_events(company_code,status);

alter table public.contractor_hse_events enable row level security;
create policy "contractor_hse_events_select" on public.contractor_hse_events for select using (public.can_view_unit(unit));
create policy "contractor_hse_events_insert" on public.contractor_hse_events for insert with check (public.can_manage_unit(unit));
create policy "contractor_hse_events_update" on public.contractor_hse_events for update using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
create policy "contractor_hse_events_delete_admin" on public.contractor_hse_events for delete using (public.current_role() = 'Admin');

create trigger contractor_hse_events_set_updated_at before update on public.contractor_hse_events
for each row execute function public.set_updated_at();

-- SINSHE 2.0 - Safety Violation Ticket Management
-- Source alignment:
-- - Handover HSE: inspection result -> issued safety violation ticket -> violation/follow-up documentation.
-- - KPNPLT-SOP-HC-020: ST/SP submission records violation type, incident date,
--   warning given and target improvement; HCO Region/PGA verifies/issues ST/SP;
--   employee acknowledgement; ST/SP validity is 6 months.

create table if not exists public.safety_violation_tickets (
  id text primary key,
  company_code text not null references public.companies(code),
  unit text not null,
  location text,
  incident_date date not null,
  issued_date date,
  employee_name text not null,
  nik text,
  department text,
  position text,
  source_type text not null default 'Inspection',
  source_record_id text,
  source_reference text,
  violation_type text not null,
  violation_description text not null,
  warning_given text,
  target_improvement text,
  improvement_due_date date,
  direct_superior text,
  higher_superior text,
  hco_pga_reviewer text,
  evidence_ref text,
  status text not null default 'Draft'
    check (status in ('Draft','Issued','Acknowledged','Follow-up','Closed','Cancelled')),
  employee_acknowledged boolean not null default false,
  employee_acknowledged_at timestamptz,
  disciplinary_action text,
  disciplinary_issued_date date,
  disciplinary_valid_until date,
  followup_result text,
  closure_evidence text,
  closed_at timestamptz,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_safety_violation_company_status
  on public.safety_violation_tickets(company_code,status);
create index if not exists idx_safety_violation_incident_date
  on public.safety_violation_tickets(incident_date desc);
create index if not exists idx_safety_violation_due
  on public.safety_violation_tickets(improvement_due_date,status);

alter table public.safety_violation_tickets enable row level security;

drop policy if exists safety_violation_select on public.safety_violation_tickets;
create policy safety_violation_select on public.safety_violation_tickets
  for select using (public.can_view_unit(unit));

drop policy if exists safety_violation_insert on public.safety_violation_tickets;
create policy safety_violation_insert on public.safety_violation_tickets
  for insert with check (public.can_manage_unit(unit));

drop policy if exists safety_violation_update on public.safety_violation_tickets;
create policy safety_violation_update on public.safety_violation_tickets
  for update using (public.can_manage_unit(unit))
  with check (public.can_manage_unit(unit));

drop policy if exists safety_violation_delete on public.safety_violation_tickets;
create policy safety_violation_delete on public.safety_violation_tickets
  for delete using (public.current_role() = 'Admin');

drop trigger if exists set_safety_violation_updated_at on public.safety_violation_tickets;
create trigger set_safety_violation_updated_at
  before update on public.safety_violation_tickets
  for each row execute function public.set_updated_at();

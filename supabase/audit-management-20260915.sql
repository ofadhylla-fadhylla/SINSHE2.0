-- SINSHE 2.0 · Audit Management
-- Applied to Supabase project synmhawsidogugkverxk on 2026-09-15.

create table if not exists public.audit_plans (
  id text primary key,
  company_code text references public.companies(code),
  audit_type text not null default 'Internal Audit',
  title text not null,
  standard text,
  unit text not null,
  location text,
  lead_auditor text,
  audit_team text,
  planned_date date not null,
  end_date date,
  status text not null default 'Planned' check (status in ('Planned','In Progress','Review','Closed','Cancelled')),
  scope text,
  score numeric(5,2),
  summary text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_checklist (
  id text primary key,
  audit_id text not null references public.audit_plans(id) on delete cascade,
  company_code text references public.companies(code),
  unit text not null,
  category text,
  clause text,
  requirement text not null,
  result text not null default 'Pending' check (result in ('Pending','Conform','Non-Conform','N/A')),
  note text,
  evidence text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_findings (
  id text primary key,
  audit_id text not null references public.audit_plans(id) on delete cascade,
  company_code text references public.companies(code),
  unit text not null,
  finding_type text not null default 'Observation' check (finding_type in ('NC Major','NC Minor','OFI','Observation','Positive')),
  clause text,
  finding text not null,
  root_cause text,
  corrective_action text,
  pic text,
  due_date date,
  status text not null default 'Open' check (status in ('Open','Action Pending','Verification','Closed')),
  evidence text,
  closure_date date,
  verified_by text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audit_plans_company_status_idx on public.audit_plans(company_code,status);
create index if not exists audit_checklist_audit_idx on public.audit_checklist(audit_id,result);
create index if not exists audit_findings_audit_status_idx on public.audit_findings(audit_id,status);
create index if not exists audit_findings_due_idx on public.audit_findings(due_date,status);

alter table public.audit_plans enable row level security;
alter table public.audit_checklist enable row level security;
alter table public.audit_findings enable row level security;

create policy audit_plans_select on public.audit_plans for select using (public.can_view_unit(unit));
create policy audit_plans_insert on public.audit_plans for insert with check (public.can_manage_unit(unit));
create policy audit_plans_update on public.audit_plans for update using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
create policy audit_plans_delete on public.audit_plans for delete using (public."current_role"() = 'Admin');

create policy audit_checklist_select on public.audit_checklist for select using (public.can_view_unit(unit));
create policy audit_checklist_insert on public.audit_checklist for insert with check (public.can_manage_unit(unit));
create policy audit_checklist_update on public.audit_checklist for update using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
create policy audit_checklist_delete on public.audit_checklist for delete using (public."current_role"() = 'Admin');

create policy audit_findings_select on public.audit_findings for select using (public.can_view_unit(unit));
create policy audit_findings_insert on public.audit_findings for insert with check (public.can_manage_unit(unit));
create policy audit_findings_update on public.audit_findings for update using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
create policy audit_findings_delete on public.audit_findings for delete using (public."current_role"() = 'Admin');

create trigger set_audit_plans_updated_at before update on public.audit_plans for each row execute procedure public.set_updated_at();
create trigger set_audit_checklist_updated_at before update on public.audit_checklist for each row execute procedure public.set_updated_at();
create trigger set_audit_findings_updated_at before update on public.audit_findings for each row execute procedure public.set_updated_at();

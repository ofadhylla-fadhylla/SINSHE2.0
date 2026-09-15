-- Digital JSA foundation, applied to Supabase production on 2026-09-15.
create table if not exists public.jsa_assessments (
  id text primary key,
  company_code text not null references public.companies(code) on update cascade,
  title text not null,
  job_type text not null default 'General Work',
  unit text not null,
  location text not null default '',
  supervisor text not null default '',
  approver text not null default '',
  assessment_date date not null default current_date,
  valid_until date,
  status text not null default 'Draft' check (status in ('Draft','Review','Approved','Rejected','Archived')),
  permit_required boolean not null default true,
  work_description text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jsa_steps (
  id text primary key,
  jsa_id text not null references public.jsa_assessments(id) on delete cascade,
  company_code text not null references public.companies(code) on update cascade,
  step_no integer not null check (step_no >= 1),
  job_step text not null,
  hazard text not null,
  consequence text,
  likelihood integer not null default 1 check (likelihood between 1 and 5),
  severity integer not null default 1 check (severity between 1 and 5),
  initial_risk text,
  existing_controls text,
  control_type text,
  additional_controls text,
  residual_likelihood integer not null default 1 check (residual_likelihood between 1 and 5),
  residual_severity integer not null default 1 check (residual_severity between 1 and 5),
  residual_risk text,
  owner text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (jsa_id, step_no)
);

create index if not exists jsa_assessments_company_status_idx on public.jsa_assessments(company_code, status);
create index if not exists jsa_assessments_unit_date_idx on public.jsa_assessments(unit, assessment_date desc);
create index if not exists jsa_steps_jsa_idx on public.jsa_steps(jsa_id, step_no);
create index if not exists jsa_steps_company_idx on public.jsa_steps(company_code);

alter table public.jsa_assessments enable row level security;
alter table public.jsa_steps enable row level security;

create policy "jsa_assessments_select" on public.jsa_assessments for select using (public.can_view_unit(unit));
create policy "jsa_assessments_insert" on public.jsa_assessments for insert with check (public.can_manage_unit(unit));
create policy "jsa_assessments_update" on public.jsa_assessments for update using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
create policy "jsa_assessments_delete" on public.jsa_assessments for delete using (public.current_role() = 'Admin');

create policy "jsa_steps_select" on public.jsa_steps for select using (
  exists (select 1 from public.jsa_assessments a where a.id = jsa_steps.jsa_id and public.can_view_unit(a.unit))
);
create policy "jsa_steps_insert" on public.jsa_steps for insert with check (
  exists (select 1 from public.jsa_assessments a where a.id = jsa_steps.jsa_id and public.can_manage_unit(a.unit))
);
create policy "jsa_steps_update" on public.jsa_steps for update using (
  exists (select 1 from public.jsa_assessments a where a.id = jsa_steps.jsa_id and public.can_manage_unit(a.unit))
) with check (
  exists (select 1 from public.jsa_assessments a where a.id = jsa_steps.jsa_id and public.can_manage_unit(a.unit))
);
create policy "jsa_steps_delete" on public.jsa_steps for delete using (public.current_role() = 'Admin');

create trigger jsa_assessments_set_updated_at before update on public.jsa_assessments for each row execute function public.set_updated_at();
create trigger jsa_steps_set_updated_at before update on public.jsa_steps for each row execute function public.set_updated_at();

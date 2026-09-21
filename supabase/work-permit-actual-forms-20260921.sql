-- SINSHE 2.0 - Work Permit actual form extension
-- Source: KPNPLT-FORM-SST-008.01 s.d. 008.05 and CMA-SOP-SST-008
-- Applied to production Supabase on 2026-09-21.

alter table public.permits
  add column if not exists form_code text,
  add column if not exists workers jsonb not null default '[]'::jsonb,
  add column if not exists safety_checklist jsonb not null default '[]'::jsonb,
  add column if not exists equipment jsonb not null default '{}'::jsonb,
  add column if not exists ppe jsonb not null default '{}'::jsonb,
  add column if not exists environment_notes text,
  add column if not exists gas_test jsonb not null default '{}'::jsonb,
  add column if not exists applicant_name text,
  add column if not exists assistant_reviewer text,
  add column if not exists ak3_reviewer text,
  add column if not exists approver_name text,
  add column if not exists closure jsonb not null default '{}'::jsonb,
  add column if not exists source_form text;

create index if not exists permits_company_type_status_idx
  on public.permits(company_code, permit_type, status);

create index if not exists permits_end_at_status_idx
  on public.permits(end_at, status);

-- QR Inspection workflow foundation (applied to Supabase on 2026-09-15)
create table if not exists public.qr_inspection_runs (
  id text primary key,
  company_code text references public.companies(code),
  target_type text not null default 'Asset' check (target_type in ('Asset','Location')),
  target_id text not null,
  target_name text not null,
  unit text not null,
  location text default '',
  inspector text not null default '',
  inspection_date date not null default current_date,
  status text not null default 'Draft' check (status in ('Draft','Completed','Cancelled')),
  score numeric,
  qr_value text,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qr_inspection_items (
  id text primary key,
  run_id text not null references public.qr_inspection_runs(id) on delete cascade,
  company_code text references public.companies(code),
  unit text not null,
  seq integer not null check (seq >= 1),
  category text,
  checkpoint text not null,
  result text not null default 'Pending' check (result in ('Pending','OK','NG','N/A')),
  risk text not null default 'Medium' check (risk in ('Low','Medium','High','Critical')),
  note text,
  evidence_document_id text references public.evidence_documents(id),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists qr_inspection_runs_company_date_idx on public.qr_inspection_runs(company_code, inspection_date desc);
create index if not exists qr_inspection_runs_target_idx on public.qr_inspection_runs(target_type, target_id);
create index if not exists qr_inspection_items_run_idx on public.qr_inspection_items(run_id, seq);

alter table public.qr_inspection_runs enable row level security;
alter table public.qr_inspection_items enable row level security;

drop policy if exists qr_inspection_runs_select on public.qr_inspection_runs;
create policy qr_inspection_runs_select on public.qr_inspection_runs for select using (public.can_view_unit(unit));
drop policy if exists qr_inspection_runs_insert on public.qr_inspection_runs;
create policy qr_inspection_runs_insert on public.qr_inspection_runs for insert with check (public.can_manage_unit(unit));
drop policy if exists qr_inspection_runs_update on public.qr_inspection_runs;
create policy qr_inspection_runs_update on public.qr_inspection_runs for update using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
drop policy if exists qr_inspection_runs_delete on public.qr_inspection_runs;
create policy qr_inspection_runs_delete on public.qr_inspection_runs for delete using (public.current_role() = 'Admin');

drop policy if exists qr_inspection_items_select on public.qr_inspection_items;
create policy qr_inspection_items_select on public.qr_inspection_items for select using (public.can_view_unit(unit));
drop policy if exists qr_inspection_items_insert on public.qr_inspection_items;
create policy qr_inspection_items_insert on public.qr_inspection_items for insert with check (public.can_manage_unit(unit));
drop policy if exists qr_inspection_items_update on public.qr_inspection_items;
create policy qr_inspection_items_update on public.qr_inspection_items for update using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit));
drop policy if exists qr_inspection_items_delete on public.qr_inspection_items;
create policy qr_inspection_items_delete on public.qr_inspection_items for delete using (public.current_role() = 'Admin');

drop trigger if exists set_qr_inspection_runs_updated_at on public.qr_inspection_runs;
create trigger set_qr_inspection_runs_updated_at before update on public.qr_inspection_runs for each row execute function public.set_updated_at();
drop trigger if exists set_qr_inspection_items_updated_at on public.qr_inspection_items;
create trigger set_qr_inspection_items_updated_at before update on public.qr_inspection_items for each row execute function public.set_updated_at();

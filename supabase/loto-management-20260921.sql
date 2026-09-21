create table if not exists public.loto_installations (
  id text primary key,
  company_code text not null references public.companies(code), unit text not null,
  form_code text not null default 'KPNPLT-FORM-SST-008.06', loto_date date not null, loto_time text,
  energy_type text not null, location text not null, equipment text not null, valid_until timestamptz,
  requester text, authorized_worker text, assistant_reviewer text, manager_approver text,
  checklist jsonb not null default '[]'::jsonb, evidence_ref text, permit_ref text, jsa_ref text,
  status text not null default 'Draft' check (status in ('Draft','Applied','Cancelled')), notes text,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_loto_installations_company_status on public.loto_installations(company_code,status);
create index if not exists idx_loto_installations_date on public.loto_installations(loto_date desc);

create table if not exists public.loto_releases (
  id text primary key, installation_id text references public.loto_installations(id) on delete set null,
  company_code text not null references public.companies(code), unit text not null,
  form_code text not null default 'KPNPLT-FORM-SST-008.07', loto_date date not null, loto_time text,
  energy_type text not null, location text not null, equipment text not null, valid_until timestamptz,
  requester text, authorized_worker text, assistant_reviewer text, manager_approver text,
  checklist jsonb not null default '[]'::jsonb, evidence_ref text,
  status text not null default 'Draft' check (status in ('Draft','Released','Cancelled')), notes text,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_loto_releases_company_status on public.loto_releases(company_code,status);
create index if not exists idx_loto_releases_installation on public.loto_releases(installation_id);

create table if not exists public.loto_inventory (
  id text primary key, company_code text not null references public.companies(code), unit text not null,
  location text not null, device_type text not null, device_code text,
  quantity integer not null default 1 check (quantity >= 0),
  condition text not null default 'Good' check (condition in ('Good','Need Repair','Unserviceable')),
  custodian text, last_check date, evidence_ref text, notes text,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists idx_loto_inventory_company_location on public.loto_inventory(company_code,location);

alter table public.loto_installations enable row level security;
alter table public.loto_releases enable row level security;
alter table public.loto_inventory enable row level security;

do $$ begin create policy loto_installations_select on public.loto_installations for select to authenticated using (public.can_view_unit(unit)); exception when duplicate_object then null; end $$;
do $$ begin create policy loto_installations_insert on public.loto_installations for insert to authenticated with check (public.can_manage_unit(unit)); exception when duplicate_object then null; end $$;
do $$ begin create policy loto_installations_update on public.loto_installations for update to authenticated using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit)); exception when duplicate_object then null; end $$;
do $$ begin create policy loto_installations_delete on public.loto_installations for delete to authenticated using (public.current_role() = 'Admin'); exception when duplicate_object then null; end $$;
do $$ begin create policy loto_releases_select on public.loto_releases for select to authenticated using (public.can_view_unit(unit)); exception when duplicate_object then null; end $$;
do $$ begin create policy loto_releases_insert on public.loto_releases for insert to authenticated with check (public.can_manage_unit(unit)); exception when duplicate_object then null; end $$;
do $$ begin create policy loto_releases_update on public.loto_releases for update to authenticated using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit)); exception when duplicate_object then null; end $$;
do $$ begin create policy loto_releases_delete on public.loto_releases for delete to authenticated using (public.current_role() = 'Admin'); exception when duplicate_object then null; end $$;
do $$ begin create policy loto_inventory_select on public.loto_inventory for select to authenticated using (public.can_view_unit(unit)); exception when duplicate_object then null; end $$;
do $$ begin create policy loto_inventory_insert on public.loto_inventory for insert to authenticated with check (public.can_manage_unit(unit)); exception when duplicate_object then null; end $$;
do $$ begin create policy loto_inventory_update on public.loto_inventory for update to authenticated using (public.can_manage_unit(unit)) with check (public.can_manage_unit(unit)); exception when duplicate_object then null; end $$;
do $$ begin create policy loto_inventory_delete on public.loto_inventory for delete to authenticated using (public.current_role() = 'Admin'); exception when duplicate_object then null; end $$;
do $$ begin create trigger trg_loto_installations_updated_at before update on public.loto_installations for each row execute function public.set_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger trg_loto_releases_updated_at before update on public.loto_releases for each row execute function public.set_updated_at(); exception when duplicate_object then null; end $$;
do $$ begin create trigger trg_loto_inventory_updated_at before update on public.loto_inventory for each row execute function public.set_updated_at(); exception when duplicate_object then null; end $$;
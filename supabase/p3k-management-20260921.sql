-- P3K / First Aid Management
-- Applied to Supabase project synmhawsidogugkverxk on 2026-09-21.
-- Source basis: CMA-SOP-SST-009 and its referenced forms 009.01–009.04.

create table if not exists public.p3k_locations (
  id text primary key,
  company_code text references public.companies(code),
  unit text not null default 'Unknown',
  work_unit text,
  work_area text,
  kit_type text,
  container_type text,
  pic text,
  worker_count integer not null default 0,
  required_qty integer not null default 0,
  actual_qty integer not null default 0,
  distance_rule text,
  regulatory_basis text,
  documentation_ref text,
  status text not null default 'Not Assessed',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.p3k_stock (
  id text primary key,
  company_code text references public.companies(code),
  location_id text references public.p3k_locations(id) on delete cascade,
  unit text not null default 'Unknown',
  reporting_month date not null,
  item_name text not null,
  standard_qty integer not null default 0,
  actual_qty integer not null default 0,
  shortage_qty integer not null default 0,
  expiry_date date,
  condition text,
  refill_method text,
  status text not null default 'Available',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.p3k_usage (
  id text primary key,
  company_code text references public.companies(code),
  location_id text references public.p3k_locations(id) on delete cascade,
  unit text not null default 'Unknown',
  usage_date date not null,
  user_name text,
  victim_name text,
  item_name text not null,
  qty_used integer not null default 1,
  injury_case text,
  treatment text,
  referred_to_clinic boolean not null default false,
  recorded_by text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.p3k_inspections (
  id text primary key,
  company_code text references public.companies(code),
  location_id text references public.p3k_locations(id) on delete cascade,
  unit text not null default 'Unknown',
  inspection_date date not null,
  inspector text,
  completeness_status text not null default 'Not Checked',
  expired_item_count integer not null default 0,
  shortage_item_count integer not null default 0,
  demo_status text not null default 'Not Checked',
  photo_ref text,
  action text,
  due_date date,
  status text not null default 'Open',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.p3k_locations enable row level security;
alter table public.p3k_stock enable row level security;
alter table public.p3k_usage enable row level security;
alter table public.p3k_inspections enable row level security;

-- Production policies use can_view_unit(unit), can_manage_unit(unit), current_role(),
-- and set_updated_at() consistently with the other SINSHE operational tables.

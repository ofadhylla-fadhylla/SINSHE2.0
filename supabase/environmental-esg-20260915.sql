-- Environmental & ESG Dashboard foundation
create table if not exists public.environmental_metrics (
  id text primary key,
  company_code text references public.companies(code),
  unit text not null default 'Head Office',
  period_date date not null,
  category text not null,
  parameter text not null,
  value numeric not null,
  unit_measure text not null,
  target_value numeric,
  target_operator text not null default 'info' check (target_operator in ('<=','>=','info')),
  source_ref text,
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.environmental_events (
  id text primary key,
  company_code text references public.companies(code),
  unit text not null default 'Head Office',
  event_date date not null,
  event_type text not null,
  severity text not null default 'Medium' check (severity in ('Low','Medium','High','Critical')),
  description text not null,
  location text,
  pic text,
  immediate_action text,
  corrective_action text,
  due_date date,
  status text not null default 'Open' check (status in ('Open','In Progress','Monitoring','Closed')),
  evidence text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists environmental_metrics_company_period_idx on public.environmental_metrics(company_code, period_date desc);
create index if not exists environmental_metrics_category_idx on public.environmental_metrics(category, parameter);
create index if not exists environmental_events_company_status_idx on public.environmental_events(company_code, status, due_date);

alter table public.environmental_metrics enable row level security;
alter table public.environmental_events enable row level security;

create policy environmental_metrics_select on public.environmental_metrics for select using (can_view_unit(unit));
create policy environmental_metrics_insert on public.environmental_metrics for insert with check (can_manage_unit(unit));
create policy environmental_metrics_update on public.environmental_metrics for update using (can_manage_unit(unit)) with check (can_manage_unit(unit));
create policy environmental_metrics_delete on public.environmental_metrics for delete using ("current_role"() = 'Admin');
create policy environmental_events_select on public.environmental_events for select using (can_view_unit(unit));
create policy environmental_events_insert on public.environmental_events for insert with check (can_manage_unit(unit));
create policy environmental_events_update on public.environmental_events for update using (can_manage_unit(unit)) with check (can_manage_unit(unit));
create policy environmental_events_delete on public.environmental_events for delete using ("current_role"() = 'Admin');

create trigger environmental_metrics_updated_at before update on public.environmental_metrics for each row execute function public.set_updated_at();
create trigger environmental_events_updated_at before update on public.environmental_events for each row execute function public.set_updated_at();

-- SINSHE 2.0 Reminder Engine state table
-- Applied to Supabase project synmhawsidogugkverxk on 2026-09-15.

create table if not exists public.reminder_actions (
  id text primary key,
  company_code text references public.companies(code) on delete set null,
  unit text not null default 'Head Office',
  source text not null,
  source_record_id text not null,
  reminder_type text not null,
  action_status text not null default 'Active' check (action_status in ('Active','Acknowledged','Snoozed')),
  snoozed_until date,
  note text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminder_actions_source_idx on public.reminder_actions(source, source_record_id);
create index if not exists reminder_actions_company_idx on public.reminder_actions(company_code, action_status);
create index if not exists reminder_actions_snooze_idx on public.reminder_actions(snoozed_until);

drop trigger if exists set_reminder_actions_updated_at on public.reminder_actions;
create trigger set_reminder_actions_updated_at
before update on public.reminder_actions
for each row execute function public.set_updated_at();

alter table public.reminder_actions enable row level security;

drop policy if exists reminder_actions_select on public.reminder_actions;
create policy reminder_actions_select on public.reminder_actions
for select using (public.can_view_unit(unit));

drop policy if exists reminder_actions_insert on public.reminder_actions;
create policy reminder_actions_insert on public.reminder_actions
for insert with check (public.can_manage_unit(unit));

drop policy if exists reminder_actions_update on public.reminder_actions;
create policy reminder_actions_update on public.reminder_actions
for update using (public.can_manage_unit(unit))
with check (public.can_manage_unit(unit));

drop policy if exists reminder_actions_delete on public.reminder_actions;
create policy reminder_actions_delete on public.reminder_actions
for delete using (public."current_role"() = 'Admin');

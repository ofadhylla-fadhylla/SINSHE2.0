-- SINSHE 2.0 — Safety Briefing material, GPS and photo evidence
-- Production schema applied and verified on 2026-09-24.

alter table public.safety_sessions
  add column if not exists material_id integer,
  add column if not exists material_title text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists gps_accuracy_m double precision,
  add column if not exists gps_captured_at timestamptz,
  add column if not exists photo_path text,
  add column if not exists photo_name text,
  add column if not exists photo_captured_at timestamptz;

comment on column public.safety_sessions.material_id is 'Selected Safety Briefing material number 1-41';
comment on column public.safety_sessions.latitude is 'GPS latitude captured from briefing device';
comment on column public.safety_sessions.longitude is 'GPS longitude captured from briefing device';
comment on column public.safety_sessions.photo_path is 'Private storage path for briefing activity photo';

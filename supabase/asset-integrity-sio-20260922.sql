-- SINSHE 2.0 - Asset Integrity + SIO foundation
-- Applied to production Supabase on 2026-09-22.

create table if not exists public.asset_inspection_standards (
  id bigint generated always as identity primary key,
  equipment_name text not null unique,
  category text not null,
  regulation text not null,
  obligation text,
  frequency_text text,
  interval_months integer,
  source_name text not null default '2026 Monitoring SILO.xlsx',
  source_sheet text not null default 'STANDAR RIKSA UJI',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.asset_inspection_standards(equipment_name,category,regulation,obligation,frequency_text,interval_months)
values
('BOILER','Pesawat Uap','Undang-undang Uap tahun 1930','Pengawasan, pemeriksaan dan pengujian pesawat uap sesuai ketentuan.','1 th',12),
('STEAM SEPARATOR','Bejana Tekan','Permenaker No 37 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','1 th',12),
('STERILIZER','Bejana Tekan','Permenaker No 37 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','2 th',24),
('THERMAL DEAERATOR','Bejana Tekan','Permenaker No 37 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','1 th',12),
('AIR RECEIVER TANK','Bejana Tekan','Permenaker No 37 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','1 th',12),
('BPV','Bejana Tekan','Permenaker No 37 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','1 th',12),
('AIR COMPRESSOR','Bejana Tekan','Permenaker No 37 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','1 th',12),
('TANGKI TIMBUN','Tangki Timbun Solar','Permenaker No 37 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','2 th',24),
('DIESEL/ GENSET','Pesawat Tenaga Produksi','Permenaker No 38 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','1 th',12),
('TURBIN UAP','Pesawat Tenaga Produksi','Permenaker No 38 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','1 th',12),
('MESIN BUBUT','Pesawat Tenaga Produksi','Permenaker No 38 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','1 th',12),
('MESIN BOR','Pesawat Tenaga Produksi','Permenaker No 38 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','1 th',12),
('MESIN GERINDA','Pesawat Tenaga Produksi','Permenaker No 38 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','1 th',12),
('MESIN LAS','Pesawat Tenaga Produksi','Permenaker No 38 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','1 th',12),
('MESIN CRUSHER','Pesawat Tenaga Produksi','Permenaker No 38 Tahun 2016','Pemeriksaan/pengujian pertama, berkala, khusus dan ulang.','1 th',12),
('EXCAVATOR','Pesawat Angkat Angkut','Permenaker No. 8 Tahun 2020','Pemeriksaan dan pengujian pesawat angkat/angkut.','1 th',12),
('BACHKHOE LOADER','Pesawat Angkat Angkut','Permenaker No. 8 Tahun 2020','Pemeriksaan dan pengujian pesawat angkat/angkut.','1 th',12),
('WHEL- LOADER','Pesawat Angkat Angkut','Permenaker No. 8 Tahun 2020','Pemeriksaan dan pengujian pesawat angkat/angkut.','1 th',12),
('COMPACTOR','Pesawat Angkat Angkut','Permenaker No. 8 Tahun 2020','Pemeriksaan dan pengujian pesawat angkat/angkut.','1 th',12),
('MOTOR GRADER','Pesawat Angkat Angkut','Permenaker No. 8 Tahun 2020','Pemeriksaan dan pengujian pesawat angkat/angkut.','1 th',12),
('TRACTOR','Pesawat Angkat Angkut','Permenaker No. 8 Tahun 2020','Pemeriksaan dan pengujian pesawat angkat/angkut.','1 th',12),
('HOISTING CRANE','Pesawat Angkat Angkut','Permenaker No. 8 Tahun 2020','Pemeriksaan dan pengujian pesawat angkat/angkut.','1 th',12),
('BUS','Pesawat Angkat Angkut','Permenaker No. 8 Tahun 2020','Pemeriksaan dan pengujian pesawat angkat/angkut.','1 th',12),
('DUMP TRUCK','Pesawat Angkat Angkut','Permenaker No. 8 Tahun 2020','Pemeriksaan dan pengujian pesawat angkat/angkut.','1 th',12),
('CONVEYOR','Pesawat Angkat Angkut','Permenaker No. 8 Tahun 2020','Pemeriksaan dan pengujian pesawat angkat/angkut.','1 th',12),
('INSTALASI PENYALUR PETIR','Instalasi Penyalur Petir','Permenaker No. 31 Tahun 2015','Pemeriksaan/pengujian berkala instalasi penyalur petir.','2 th',24),
('INSTALASI LISTRIK','Instalasi Listrik','Permenaker No. 33 Tahun 2015 / Permenaker No. 12 Tahun 2015','Pemeriksaan berkala paling sedikit 1 tahun sekali dan pengujian berkala paling sedikit 5 tahun sekali.','1 th',12),
('FIRE HYDRANT','Fire Protection','Instruksi Menteri Tenaga Kerja No. 11/M/BW/1997','Pemeriksaan intensif sarana penanggulangan kebakaran.','1 th',12)
on conflict (equipment_name) do update set
  category=excluded.category,
  regulation=excluded.regulation,
  obligation=excluded.obligation,
  frequency_text=excluded.frequency_text,
  interval_months=excluded.interval_months,
  updated_at=now();

alter table public.asset_inspection_standards enable row level security;
revoke all on table public.asset_inspection_standards from anon;
revoke all on table public.asset_inspection_standards from authenticated;
grant select on table public.asset_inspection_standards to authenticated;
do $$ begin create policy asset_inspection_standards_select on public.asset_inspection_standards for select to authenticated using (true); exception when duplicate_object then null; end $$;

alter table public.learning_records
  add column if not exists record_type text not null default 'Training',
  add column if not exists job_title text,
  add column if not exists work_status text not null default 'Active',
  add column if not exists document_link text,
  add column if not exists notes text;

create index if not exists learning_records_type_status_idx on public.learning_records(record_type,status);
create index if not exists learning_records_valid_until_idx on public.learning_records(valid_until) where valid_until is not null;

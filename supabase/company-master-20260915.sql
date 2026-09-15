create table if not exists public.companies (
  code text primary key,
  company_name text not null,
  pic text,
  region text,
  province text,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Source: Company_List_From_Image(4).xlsx supplied by user on 2026-09-15.
insert into public.companies (code, company_name, pic, region, province, status) values
('ACP','Agrinusa Cipta Persada','Fabian','Merauke','Papua Barat','Active'),
('AJP','Alam Jaya Persada','Kurniadi','Kutai Kartanegara','Kalimantan Timur','Active'),
('APM','Agricipta Persada Mulia','Fabian','Merauke','Papua Barat','Active'),
('BAS','Bumi Alam Sentosa','Romawanto','Kubu Raya','Kalimantan Barat','Active'),
('BSU','Berkat Sawit Utama','Endri Yeni','Sungai Kandang','Jambi','Active'),
('CMA','Citra Mahkota','Komang','Nanga Pinoh','Kalimantan Barat','Active'),
('CRS','Citra Riau Sarana','Kengjas','Kuantan Singingi','Pekanbaru','Active'),
('GAN','Graha Agro Nusantara','Erna','Kubu Raya','Kalimantan Barat','Active'),
('HSS','HSS','Kurniadi','Paser','Kalimantan Timur','Active'),
('IBP','Intitama Berlian Perkebunan','Adi Iswanto','Bengkayang','Kalimantan Barat','Active'),
('IKU','Indo Kebun Unggul','Endri Yeni','Sungai Kandang','Jambi','Active'),
('JJP','Jatim Jaya Perkasa','Azzah','Bagan Siapi api','Pekanbaru','Active'),
('KAMU','KAMU','Daud Boma','Agam','Sumatera Barat','Active'),
('NJP','Nusa Jaya Perkasa','Romawanto','Kubu Raya','Kalimantan Barat','Active'),
('PLDK','Putra Lirik Domas','Romawanto','Kubu Raya','Kalimantan Barat','Active'),
('PLDS','Putra Lirik Domas','Sandi','Sambas','Kalimantan Barat','Active'),
('PNPP','Perkebunan Anak Negeri Pasaman','Daud Boma','Agam','Sumatera Barat','Active'),
('PNPS','Perkebunan Anak Negeri Pasaman','Sandi','Sambas','Kalimantan Barat','Active'),
('PNPL','Perkebunan Anak Negeri Pasaman','Jaya','Landak','Kalimantan Barat','Active'),
('PTW','Patiware','Jaya','Bengkayang','Kalimantan Barat','Active'),
('SAM','Sentosa Asih Makmur','Sandi','Sambas','Kalimantan Barat','Active'),
('SIP','Swadaya Indopalma','Markoni','Palembang','Sumatera Selatan','Active'),
('SUAN','SUAN','Guntur','Kutai Kartanegara','Kalimantan Timur','Active'),
('SUMK','Sumatera Unggul Makmur','Romawanto','Kubu Raya','Kalimantan Barat','Active'),
('SUMS','Sumatera Unggul Makmur','Jaya','Sambas','Kalimantan Barat','Active'),
('THP','TH Indo Plantation','Said','Indragiri Hilir','Pekanbaru','Active'),
('TSB','Tritunggal Sentra Buana','Guntur','Kutai Kartanegara','Kalimantan Timur','Active'),
('WKN','Wawasan Kebun Nusantara','Adi Iswanto','Bengkayang','Kalimantan Barat','Active'),
('WKSM','Wahana Karya Sejahtera Mandiri','Erik Sihombing','Tobadak','Mamuju','Active')
on conflict (code) do update set company_name=excluded.company_name,pic=excluded.pic,region=excluded.region,province=excluded.province,status=excluded.status,updated_at=now();

alter table public.companies enable row level security;
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select to authenticated using (public.is_active_user());
drop policy if exists companies_manage on public.companies;
create policy companies_manage on public.companies for all to authenticated using (public.current_role() in ('Admin','Manager')) with check (public.current_role() in ('Admin','Manager'));

alter table public.observations add column if not exists company_code text references public.companies(code) on update cascade on delete set null;
alter table public.corrective_actions add column if not exists company_code text references public.companies(code) on update cascade on delete set null;
alter table public.incidents add column if not exists company_code text references public.companies(code) on update cascade on delete set null;
alter table public.permits add column if not exists company_code text references public.companies(code) on update cascade on delete set null;
alter table public.assets add column if not exists company_code text references public.companies(code) on update cascade on delete set null;
alter table public.regulatory_obligations add column if not exists company_code text references public.companies(code) on update cascade on delete set null;
alter table public.hazards add column if not exists company_code text references public.companies(code) on update cascade on delete set null;

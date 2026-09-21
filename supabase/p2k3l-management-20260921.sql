-- P2K3L Management
-- Source: KPNPLT-Form-SST-002.03/.04/.05/.06 and SOP P2K3L supplied by user.
-- Applied to production Supabase project synmhawsidogugkverxk on 2026-09-21.

-- Tables:
-- public.p2k3l_members      : Struktur P2K3L / pengesahan
-- public.p2k3l_meetings     : Notulen pertemuan P2K3L
-- public.p2k3l_attendance   : Daftar hadir rapat
-- public.p2k3l_programs     : Tujuan, Target dan Program K3L
-- public.p2k3l_reports      : Pelaporan internal bulanan / Disnaker triwulanan

-- All operational tables use RLS with can_view_unit/can_manage_unit helper policies.
-- See migration add_p2k3l_management in Supabase migration history for canonical DDL.

# SHINSE 2.0

Prototype dashboard **Smart Integrated Network for Safety, Health & Environment** untuk KPN Plantations.

## Modul pada prototype
- Ecosystem overview
- KPI Dashboard
- Asset Integrity Management
- Regulatory Compliance
- Placeholder modul lanjutan: Hazard & Risk, Inspection & Observation, Incident Management, Permit to Work

## Jalankan lokal
```bash
npm install
npm run dev
```
Buka `http://localhost:3000`.

## Deploy ke Vercel
1. Push folder ini ke GitHub.
2. Di Vercel pilih **Add New > Project**.
3. Import repository.
4. Framework otomatis terdeteksi sebagai **Next.js**.
5. Klik **Deploy**.

## Catatan
Data saat ini masih mock/static untuk menyamai konsep visual yang diberikan. Tahap berikutnya bisa ditambahkan database (Supabase/PostgreSQL), autentikasi, role & approval, upload dokumen, QR asset, notifikasi, dan API AI recommendation.

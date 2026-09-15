# Supabase setup for SINSHE 2.0

The application now supports two modes:

- **Prototype mode**: when Supabase environment variables are absent, the existing browser/localStorage prototype remains available.
- **Connected mode**: when Supabase environment variables are present, SINSHE requires login and uses the authenticated user's profile/role for menu access.

## One-time setup

1. Create or select a Supabase project for SINSHE 2.0.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Create the first account in **Authentication > Users**.
4. Promote the first account to `Admin` with the SQL snippet at the bottom of `schema.sql`.
5. In the Supabase project **Connect** dialog, copy:
   - Project URL
   - Publishable key
6. In Vercel > SINSHE2.0 > Settings > Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
7. Redeploy Production.

Do **not** put the Supabase service-role key in a `NEXT_PUBLIC_` variable. The browser must never receive it.

## Database foundation created

The schema includes profiles/RBAC plus normalized tables for observations, corrective actions, incidents, permits, assets, regulatory obligations, hazards, and audit logs. Row Level Security (RLS) limits normal users to their unit while Admin/Manager roles can view across units.

The current operational pages still retain browser fallback data while the remaining module-by-module migration is completed. This allows deployment to stay usable during the transition.

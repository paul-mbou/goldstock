-- GOLDSTOCK: the emailed sign-in code is paused until Resend has a verified sending domain (ADR 0005).
-- Supabase "Confirm email" is on instead, so the restrictive "Email code required" policies now ask
-- for a confirmed address. To resume the code, restore the body from
-- 20261024100000_auth_profiles_and_email_otp.sql in a new migration and set EMAIL_CODE_ENABLED
-- back to true in src/lib/auth.ts.

create or replace function public.second_factor_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where id = auth.uid()
      and email_confirmed_at is not null
  );
$$;

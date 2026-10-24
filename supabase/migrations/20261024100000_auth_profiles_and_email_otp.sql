-- GOLDSTOCK: accounts, shops and the email second factor.
-- Signup creates the auth user; this trigger turns its metadata into a profile and a shop.
-- A session only counts as fully signed in once the code emailed by the `email-otp`
-- Edge Function has been verified (see public.second_factor_verified()).

-- ------------------------------------------------------------------ profiles and shops

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null,
  phone text check (phone is null or phone ~ '^\+237[26][0-9]{8}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  -- One line of business per shop, chosen at signup and never changed (ADR 0003).
  business text not null check (business in ('phones', 'hair', 'clothing', 'shoes', 'cosmetics', 'grocery')),
  city text not null check (char_length(city) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shops_owner_id_idx on public.shops (owner_id);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

create function public.lock_shop_business()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.business is distinct from old.business then
    raise exception 'A shop''s line of business cannot be changed.' using errcode = 'check_violation';
  end if;
  if new.owner_id is distinct from old.owner_id then
    raise exception 'A shop cannot change owner.' using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger shops_lock_business before update on public.shops
  for each row execute function public.lock_shop_business();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, trim(meta ->> 'full_name'), new.email, nullif(meta ->> 'phone', ''));

  insert into public.shops (owner_id, name, business, city)
  values (new.id, trim(meta ->> 'shop_name'), meta ->> 'business', meta ->> 'city');

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ email second factor

-- Codes are stored hashed and bound to the auth session that asked for them.
create table public.email_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references auth.sessions (id) on delete cascade,
  code_hash text not null,
  attempts smallint not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_otp_challenges_session_idx on public.email_otp_challenges (session_id, created_at desc);
create index email_otp_challenges_user_idx on public.email_otp_challenges (user_id, created_at desc);

-- Sessions that passed the email code. Signing out deletes the auth session, and this row with it.
create table public.verified_sessions (
  session_id uuid primary key references auth.sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  verified_at timestamptz not null default now()
);

create function public.second_factor_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.verified_sessions
    where session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and user_id = auth.uid()
  );
$$;

revoke all on function public.second_factor_verified() from public, anon;
grant execute on function public.second_factor_verified() to authenticated;

-- ------------------------------------------------------------------ row level security

alter table public.profiles enable row level security;
alter table public.shops enable row level security;
-- No policies: only the Edge Function (service role) reads and writes these two.
alter table public.email_otp_challenges enable row level security;
alter table public.verified_sessions enable row level security;

create policy "Owners read their profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "Owners update their profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Owners read their shops" on public.shops
  for select to authenticated using ((select auth.uid()) = owner_id);

create policy "Owners update their shops" on public.shops
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- Restrictive: on top of the policies above, every access needs a session that passed the email code.
create policy "Email code required" on public.profiles
  as restrictive to authenticated using ((select public.second_factor_verified()));

create policy "Email code required" on public.shops
  as restrictive to authenticated using ((select public.second_factor_verified()));

revoke all on public.profiles, public.shops from anon;
revoke insert, delete on public.profiles, public.shops from authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
revoke update on public.shops from authenticated;
grant update (name, city) on public.shops to authenticated;

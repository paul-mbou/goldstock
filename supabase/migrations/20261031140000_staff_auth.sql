-- GOLDSTOCK: staff can sign in (ADR 0011).
-- is_shop_owner becomes shop access; is_account_owner is the shops.owner_id check.
-- Invited staff must not get their own shops row (see handle_new_user).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(nullif(trim(meta ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(meta ->> 'phone', '')
  );

  -- Staff invites set invited_shop_id; only owner signups create a shop.
  if coalesce(meta ->> 'invited_shop_id', '') <> '' then
    return new;
  end if;

  insert into public.shops (owner_id, name, business, city)
  values (new.id, trim(meta ->> 'shop_name'), meta ->> 'business', meta ->> 'city');

  return new;
end;
$$;

alter table public.shop_members
  add column if not exists email text not null default '',
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create unique index if not exists shop_members_shop_user_uidx
  on public.shop_members (shop_id, user_id)
  where user_id is not null;

create index if not exists shop_members_user_id_idx on public.shop_members (user_id);

-- True account holder for a shop (may manage team, shop settings).
create or replace function public.is_account_owner(target_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.shops
    where id = target_shop_id
      and owner_id = (select auth.uid())
  );
$$;

revoke all on function public.is_account_owner(uuid) from public, anon;
grant execute on function public.is_account_owner(uuid) to authenticated;

-- Shop access: account owner or a non-suspended member linked to this auth user.
create or replace function public.is_shop_owner(target_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_account_owner(target_shop_id)
    or exists (
      select 1
      from public.shop_members m
      where m.shop_id = target_shop_id
        and m.user_id = (select auth.uid())
        and m.status <> 'suspended'
    );
$$;

-- Link existing owner roster rows to the account holder.
update public.shop_members m
set user_id = s.owner_id,
    email = coalesce(nullif(m.email, ''), p.email, '')
from public.shops s
left join public.profiles p on p.id = s.owner_id
where m.shop_id = s.id
  and m.role = 'owner'
  and m.user_id is null;

-- Team: everyone with access can read; only the account owner writes.
drop policy if exists "Owners manage shop members" on public.shop_members;

create policy "Members read shop roster" on public.shop_members
  for select to authenticated
  using ((select public.is_shop_owner(shop_id)));

create policy "Account owners insert members" on public.shop_members
  for insert to authenticated
  with check ((select public.is_account_owner(shop_id)));

create policy "Account owners update members" on public.shop_members
  for update to authenticated
  using ((select public.is_account_owner(shop_id)))
  with check ((select public.is_account_owner(shop_id)));

create policy "Account owners delete members" on public.shop_members
  for delete to authenticated
  using ((select public.is_account_owner(shop_id)));

-- Staff must be able to read the shop row (hydrate / logo).
drop policy if exists "Owners read their shops" on public.shops;

create policy "Members read their shops" on public.shops
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1
      from public.shop_members m
      where m.shop_id = shops.id
        and m.user_id = (select auth.uid())
        and m.status <> 'suspended'
    )
  );

-- Account owner still updates shop identity.
drop policy if exists "Owners update their shops" on public.shops;

create policy "Account owners update their shops" on public.shops
  for update to authenticated
  using ((select public.is_account_owner(id)))
  with check ((select public.is_account_owner(id)));

-- Invited staff flip their own roster row to active on first sign-in (owners manage other fields).
create or replace function public.activate_my_membership()
returns public.shop_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  row public.shop_members;
begin
  if auth.uid() is null or not public.second_factor_verified() then
    raise exception 'not authorized';
  end if;

  update public.shop_members
  set status = 'active',
      last_seen = now()
  where user_id = auth.uid()
    and status = 'invited'
  returning * into row;

  if row.id is null then
    select * into row
    from public.shop_members
    where user_id = auth.uid()
    order by created_at
    limit 1;
  end if;

  return row;
end;
$$;

revoke all on function public.activate_my_membership() from public, anon;
grant execute on function public.activate_my_membership() to authenticated;

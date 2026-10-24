-- Google sign-in: Google accounts arrive without shop details, so the signup trigger only
-- creates the shop when the email form sent them. The owner then picks the shop name, its
-- line of business and city on /connexion/suite, through create_my_shop().

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  owner_name text := coalesce(
    nullif(trim(meta ->> 'full_name'), ''),
    nullif(trim(meta ->> 'name'), ''),
    split_part(new.email, '@', 1)
  );
begin
  if char_length(owner_name) < 2 then
    owner_name := 'Propriétaire';
  end if;

  insert into public.profiles (id, full_name, email, phone)
  values (new.id, left(owner_name, 120), new.email, nullif(meta ->> 'phone', ''));

  if nullif(meta ->> 'shop_name', '') is not null and nullif(meta ->> 'business', '') is not null then
    insert into public.shops (owner_id, name, business, city)
    values (new.id, trim(meta ->> 'shop_name'), meta ->> 'business', meta ->> 'city');
  end if;

  return new;
end;
$$;

create function public.create_my_shop(shop_name text, shop_business text, shop_city text, owner_phone text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_shop_id uuid;
begin
  if auth.uid() is null or not public.second_factor_verified() then
    raise exception 'Email code required.' using errcode = 'insufficient_privilege';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  if exists (select 1 from public.shops where owner_id = auth.uid()) then
    raise exception 'This account already has a shop.' using errcode = 'unique_violation';
  end if;

  insert into public.shops (owner_id, name, business, city)
  values (auth.uid(), trim(shop_name), shop_business, trim(shop_city))
  returning id into new_shop_id;

  if nullif(owner_phone, '') is not null then
    update public.profiles set phone = owner_phone where id = auth.uid();
  end if;

  return new_shop_id;
end;
$$;

revoke all on function public.create_my_shop(text, text, text, text) from public, anon;
grant execute on function public.create_my_shop(text, text, text, text) to authenticated;

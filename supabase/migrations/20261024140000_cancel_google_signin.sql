-- Google sign-in is cancelled: undo 20261024120000_google_signin_and_shop_setup.sql.
-- Every account comes from the signup form again, so the trigger requires the shop details.

drop function public.create_my_shop(text, text, text, text);

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
  values (new.id, trim(meta ->> 'full_name'), new.email, nullif(meta ->> 'phone', ''));

  insert into public.shops (owner_id, name, business, city)
  values (new.id, trim(meta ->> 'shop_name'), meta ->> 'business', meta ->> 'city');

  return new;
end;
$$;

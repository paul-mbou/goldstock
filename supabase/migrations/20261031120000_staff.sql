-- GOLDSTOCK: team roster, cash deposits and in-app notifications (ADR 0009).
-- Staff are roster rows for now; they do not get auth.users accounts in this batch.

create table public.shop_members (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  role text not null check (role in ('owner', 'manager', 'seller', 'stock')),
  phone text not null default '',
  shop_scope text not null default 'Toutes',
  status text not null check (status in ('active', 'invited', 'suspended')),
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shop_members_shop_id_idx on public.shop_members (shop_id);
create unique index shop_members_one_owner_idx on public.shop_members (shop_id) where (role = 'owner');

create trigger shop_members_touch_updated_at before update on public.shop_members
  for each row execute function public.touch_updated_at();

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  day date not null,
  shop_name text not null,
  manager_name text not null,
  expected integer not null check (expected >= 0),
  deposited integer not null check (deposited >= 0),
  deposited_at timestamptz not null default now(),
  method text not null,
  reference text not null default '',
  comment text not null default '',
  status text not null check (status in ('pending', 'verified', 'flagged')),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (shop_id, shop_name, day)
);

create index deposits_shop_id_day_idx on public.deposits (shop_id, day desc);

-- Client-facing text ids so n-welcome and n-<deposit-uuid> stay stable.
create table public.notifications (
  id text primary key check (char_length(id) between 1 and 80),
  shop_id uuid not null references public.shops (id) on delete cascade,
  kind text not null check (kind in ('stock', 'billing', 'team', 'deposit', 'system')),
  title text not null,
  body text not null,
  at timestamptz not null default now(),
  read boolean not null default false,
  href text not null default '/app',
  roles text[] ,
  created_at timestamptz not null default now()
);

create index notifications_shop_id_at_idx on public.notifications (shop_id, at desc);

-- ------------------------------------------------------------------ RPCs

create or replace function public.declare_deposit(
  p_shop_id uuid,
  p_day date,
  p_shop_name text,
  p_manager_name text,
  p_expected integer,
  p_deposited integer,
  p_method text,
  p_reference text,
  p_comment text,
  p_notification_title text,
  p_notification_body text
)
returns public.deposits
language plpgsql
security definer
set search_path = ''
as $$
declare
  deposit public.deposits;
begin
  if auth.uid() is null or not public.is_shop_owner(p_shop_id) or not public.second_factor_verified() then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;

  insert into public.deposits (
    shop_id, day, shop_name, manager_name, expected, deposited, method, reference, comment, status
  )
  values (
    p_shop_id, p_day, p_shop_name, p_manager_name,
    coalesce(p_expected, 0), coalesce(p_deposited, 0), p_method,
    coalesce(p_reference, ''), coalesce(p_comment, ''), 'pending'
  )
  returning * into deposit;

  insert into public.notifications (id, shop_id, kind, title, body, href, roles)
  values (
    'n-' || deposit.id::text, p_shop_id, 'deposit',
    p_notification_title, p_notification_body, '/app/versements', array['owner']::text[]
  );

  return deposit;
end;
$$;

create or replace function public.withdraw_deposit(p_deposit_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deposit public.deposits;
begin
  select * into deposit from public.deposits where id = p_deposit_id for update;
  if not found then
    return false;
  end if;
  if auth.uid() is null or not public.is_shop_owner(deposit.shop_id) or not public.second_factor_verified() then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  if deposit.status <> 'pending' then
    raise exception 'Only pending deposits can be withdrawn.' using errcode = 'check_violation';
  end if;

  delete from public.notifications where id = 'n-' || deposit.id::text;
  delete from public.deposits where id = deposit.id;
  return true;
end;
$$;

revoke all on function public.declare_deposit(uuid, date, text, text, integer, integer, text, text, text, text, text)
  from public, anon;
grant execute on function public.declare_deposit(uuid, date, text, text, integer, integer, text, text, text, text, text)
  to authenticated;
revoke all on function public.withdraw_deposit(uuid) from public, anon;
grant execute on function public.withdraw_deposit(uuid) to authenticated;

-- ------------------------------------------------------------------ RLS

alter table public.shop_members enable row level security;
alter table public.deposits enable row level security;
alter table public.notifications enable row level security;

create policy "Owners manage shop members" on public.shop_members
  for all to authenticated
  using ((select public.is_shop_owner(shop_id)))
  with check ((select public.is_shop_owner(shop_id)));

create policy "Owners manage deposits" on public.deposits
  for all to authenticated
  using ((select public.is_shop_owner(shop_id)))
  with check ((select public.is_shop_owner(shop_id)));

create policy "Owners manage notifications" on public.notifications
  for all to authenticated
  using ((select public.is_shop_owner(shop_id)))
  with check ((select public.is_shop_owner(shop_id)));

create policy "Email code required" on public.shop_members
  as restrictive to authenticated using ((select public.second_factor_verified()));
create policy "Email code required" on public.deposits
  as restrictive to authenticated using ((select public.second_factor_verified()));
create policy "Email code required" on public.notifications
  as restrictive to authenticated using ((select public.second_factor_verified()));

revoke all on public.shop_members, public.deposits, public.notifications from anon;
grant select, insert, update, delete on public.shop_members, public.deposits, public.notifications to authenticated;

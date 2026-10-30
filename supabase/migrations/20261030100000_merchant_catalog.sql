-- GOLDSTOCK: categories, products, variants and stock moves (ADR 0006).
-- Owner-only access for now; staff come in a later batch with shop_members.

-- ------------------------------------------------------------------ helpers

create or replace function public.is_shop_owner(target_shop_id uuid)
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

revoke all on function public.is_shop_owner(uuid) from public, anon;
grant execute on function public.is_shop_owner(uuid) to authenticated;

-- ------------------------------------------------------------------ categories

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  code text not null check (char_length(code) between 1 and 40),
  name text not null check (char_length(name) between 1 and 120),
  icon text not null check (char_length(icon) between 1 and 40),
  tone text not null check (tone in ('gold', 'navy', 'teal', 'rose', 'violet')),
  subs text[] not null default '{}',
  archived boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, code)
);

create index categories_shop_id_idx on public.categories (shop_id);

create table public.category_attributes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  code text not null check (char_length(code) between 1 and 40),
  name text not null check (char_length(name) between 1 and 120),
  type text not null check (type in ('text', 'number', 'date', 'list', 'multi', 'yesno', 'color')),
  options text[] not null default '{}',
  is_variant boolean not null default false,
  required boolean not null default false,
  hint text not null default '',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, code)
);

create index category_attributes_category_id_idx on public.category_attributes (category_id);

create trigger categories_touch_updated_at before update on public.categories
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ products

create table public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 160),
  sub text not null default '',
  attrs jsonb not null default '{}'::jsonb,
  min_stock integer not null default 0 check (min_stock >= 0),
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_shop_id_idx on public.products (shop_id);
create index products_category_id_idx on public.products (category_id);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null check (char_length(sku) between 1 and 64),
  label text not null default '',
  price integer not null check (price >= 0),
  cost integer not null check (cost >= 0),
  stock integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, sku)
);

create index product_variants_product_id_idx on public.product_variants (product_id);

create trigger products_touch_updated_at before update on public.products
  for each row execute function public.touch_updated_at();

create trigger product_variants_touch_updated_at before update on public.product_variants
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ stock moves

create table public.stock_moves (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  type text not null check (type in ('reception', 'entry', 'exit', 'adjust', 'loss', 'return', 'inventory')),
  qty integer not null check (qty <> 0),
  item_label text not null,
  source text,
  destination text,
  note text not null default '',
  user_name text not null,
  moved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index stock_moves_shop_id_idx on public.stock_moves (shop_id, moved_at desc);
create index stock_moves_variant_id_idx on public.stock_moves (variant_id);

-- Atomic move + stock update (owner only). qty is signed: positive in, negative out.
create or replace function public.apply_stock_move(
  p_shop_id uuid,
  p_variant_id uuid,
  p_type text,
  p_qty integer,
  p_item_label text,
  p_source text,
  p_destination text,
  p_note text,
  p_user_name text,
  p_moved_at timestamptz default now()
)
returns public.stock_moves
language plpgsql
security definer
set search_path = ''
as $$
declare
  move public.stock_moves;
  current_stock integer;
begin
  if auth.uid() is null or not public.is_shop_owner(p_shop_id) or not public.second_factor_verified() then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  if p_qty = 0 then
    raise exception 'Quantity cannot be zero.' using errcode = 'check_violation';
  end if;

  select stock into current_stock
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = p_variant_id and p.shop_id = p_shop_id
  for update;

  if not found then
    raise exception 'Variant not found.' using errcode = 'no_data_found';
  end if;

  if current_stock + p_qty < 0 then
    raise exception 'Insufficient stock.' using errcode = 'check_violation';
  end if;

  update public.product_variants
  set stock = stock + p_qty, updated_at = now()
  where id = p_variant_id;

  insert into public.stock_moves (
    shop_id, variant_id, type, qty, item_label, source, destination, note, user_name, moved_at
  )
  values (
    p_shop_id, p_variant_id, p_type, p_qty, p_item_label, p_source, p_destination,
    coalesce(p_note, ''), p_user_name, coalesce(p_moved_at, now())
  )
  returning * into move;

  return move;
end;
$$;

revoke all on function public.apply_stock_move(
  uuid, uuid, text, integer, text, text, text, text, text, timestamptz
) from public, anon;
grant execute on function public.apply_stock_move(
  uuid, uuid, text, integer, text, text, text, text, text, timestamptz
) to authenticated;

-- ------------------------------------------------------------------ RLS

alter table public.categories enable row level security;
alter table public.category_attributes enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.stock_moves enable row level security;

create policy "Owners manage categories" on public.categories
  for all to authenticated
  using ((select public.is_shop_owner(shop_id)))
  with check ((select public.is_shop_owner(shop_id)));

create policy "Owners manage category attributes" on public.category_attributes
  for all to authenticated
  using (
    (select public.is_shop_owner((select shop_id from public.categories where id = category_id)))
  )
  with check (
    (select public.is_shop_owner((select shop_id from public.categories where id = category_id)))
  );

create policy "Owners manage products" on public.products
  for all to authenticated
  using ((select public.is_shop_owner(shop_id)))
  with check ((select public.is_shop_owner(shop_id)));

create policy "Owners manage product variants" on public.product_variants
  for all to authenticated
  using (
    (select public.is_shop_owner((select shop_id from public.products where id = product_id)))
  )
  with check (
    (select public.is_shop_owner((select shop_id from public.products where id = product_id)))
  );

create policy "Owners read stock moves" on public.stock_moves
  for select to authenticated
  using ((select public.is_shop_owner(shop_id)));

-- Inserts go through apply_stock_move (security definer); block direct client inserts.
create policy "Owners cannot insert stock moves directly" on public.stock_moves
  for insert to authenticated
  with check (false);

create policy "Email code required" on public.categories
  as restrictive to authenticated using ((select public.second_factor_verified()));
create policy "Email code required" on public.category_attributes
  as restrictive to authenticated using ((select public.second_factor_verified()));
create policy "Email code required" on public.products
  as restrictive to authenticated using ((select public.second_factor_verified()));
create policy "Email code required" on public.product_variants
  as restrictive to authenticated using ((select public.second_factor_verified()));
create policy "Email code required" on public.stock_moves
  as restrictive to authenticated using ((select public.second_factor_verified()));

revoke all on public.categories, public.category_attributes, public.products,
  public.product_variants, public.stock_moves from anon;
grant select, insert, update, delete on public.categories, public.category_attributes,
  public.products, public.product_variants to authenticated;
grant select on public.stock_moves to authenticated;

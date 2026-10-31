-- GOLDSTOCK: sales and sale lines for the till (ADR 0007).
-- Stock changes for a sale go through record_sale / set_sale_cancelled / return_sale_items.

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  code text not null check (char_length(code) between 2 and 32),
  sold_at timestamptz not null default now(),
  shop_name text not null,
  seller_name text not null,
  customer text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  invoiced_at timestamptz,
  discount integer not null default 0 check (discount >= 0),
  pay text not null check (pay in ('cash', 'mtn', 'om', 'transfer')),
  received integer not null default 0 check (received >= 0),
  reference text not null default '',
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, code)
);

create index sales_shop_id_sold_at_idx on public.sales (shop_id, sold_at desc);

create table public.sale_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  name text not null,
  label text not null default '',
  category_id uuid references public.categories (id) on delete set null,
  qty integer not null check (qty > 0),
  price integer not null check (price >= 0),
  list_price integer,
  cost integer not null check (cost >= 0),
  returned integer not null default 0 check (returned >= 0),
  check (returned <= qty)
);

create index sale_lines_sale_id_idx on public.sale_lines (sale_id);
create index sale_lines_variant_id_idx on public.sale_lines (variant_id);

create trigger sales_touch_updated_at before update on public.sales
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ RPCs

create or replace function public.record_sale(
  p_shop_id uuid,
  p_code text,
  p_shop_name text,
  p_seller_name text,
  p_customer text,
  p_discount integer,
  p_pay text,
  p_received integer,
  p_reference text,
  p_lines jsonb
)
returns public.sales
language plpgsql
security definer
set search_path = ''
as $$
declare
  sale public.sales;
  line jsonb;
  v_id uuid;
  v_qty integer;
  v_price integer;
  v_list integer;
  v_stock integer;
  v_cost integer;
  v_sku text;
  v_label text;
  p_id uuid;
  p_name text;
  p_cat uuid;
begin
  if auth.uid() is null or not public.is_shop_owner(p_shop_id) or not public.second_factor_verified() then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Sale needs at least one line.' using errcode = 'check_violation';
  end if;

  insert into public.sales (
    shop_id, code, shop_name, seller_name, customer, discount, pay, received, reference
  )
  values (
    p_shop_id, p_code, p_shop_name, p_seller_name, coalesce(p_customer, ''),
    coalesce(p_discount, 0), p_pay, coalesce(p_received, 0), coalesce(p_reference, '')
  )
  returning * into sale;

  for line in select * from jsonb_array_elements(p_lines)
  loop
    v_id := (line ->> 'variant_id')::uuid;
    v_qty := (line ->> 'qty')::integer;
    v_price := (line ->> 'price')::integer;
    v_list := nullif(line ->> 'list_price', '')::integer;

    select v.stock, v.cost, v.label, v.sku, p.id, p.name, p.category_id
      into v_stock, v_cost, v_label, v_sku, p_id, p_name, p_cat
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = v_id and p.shop_id = p_shop_id
    for update of v;

    if not found then
      raise exception 'Variant not found.' using errcode = 'no_data_found';
    end if;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity.' using errcode = 'check_violation';
    end if;
    if v_stock < v_qty then
      raise exception 'Insufficient stock.' using errcode = 'check_violation';
    end if;

    update public.product_variants
    set stock = stock - v_qty, updated_at = now()
    where id = v_id;

    insert into public.sale_lines (
      sale_id, product_id, variant_id, name, label, category_id, qty, price, list_price, cost
    )
    values (
      sale.id, p_id, v_id, p_name, coalesce(v_label, ''), p_cat, v_qty,
      coalesce(v_price, 0), v_list, v_cost
    );
  end loop;

  return sale;
end;
$$;

create or replace function public.set_sale_cancelled(p_sale_id uuid, p_cancelled boolean)
returns public.sales
language plpgsql
security definer
set search_path = ''
as $$
declare
  sale public.sales;
  line record;
  delta integer;
begin
  select * into sale from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'Sale not found.' using errcode = 'no_data_found';
  end if;
  if auth.uid() is null or not public.is_shop_owner(sale.shop_id) or not public.second_factor_verified() then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  if sale.cancelled = p_cancelled then
    return sale;
  end if;

  for line in
    select variant_id, qty, returned from public.sale_lines where sale_id = p_sale_id
  loop
    delta := (line.qty - line.returned) * case when p_cancelled then 1 else -1 end;
    if delta <> 0 then
      update public.product_variants
      set stock = stock + delta, updated_at = now()
      where id = line.variant_id;
    end if;
  end loop;

  update public.sales set cancelled = p_cancelled, updated_at = now()
  where id = p_sale_id
  returning * into sale;

  return sale;
end;
$$;

create or replace function public.return_sale_items(
  p_sale_id uuid,
  p_returns jsonb,
  p_user_name text
)
returns public.sales
language plpgsql
security definer
set search_path = ''
as $$
declare
  sale public.sales;
  entry record;
  line public.sale_lines;
  qty integer;
  item_label text;
begin
  select * into sale from public.sales where id = p_sale_id for update;
  if not found then
    raise exception 'Sale not found.' using errcode = 'no_data_found';
  end if;
  if sale.cancelled then
    raise exception 'Cancelled sale.' using errcode = 'check_violation';
  end if;
  if auth.uid() is null or not public.is_shop_owner(sale.shop_id) or not public.second_factor_verified() then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;

  for entry in select * from jsonb_each_text(p_returns)
  loop
    qty := entry.value::integer;
    if qty is null or qty <= 0 then
      continue;
    end if;

    select * into line from public.sale_lines
    where sale_id = p_sale_id and variant_id = entry.key::uuid
    for update;
    if not found then
      raise exception 'Line not found.' using errcode = 'no_data_found';
    end if;
    if line.returned + qty > line.qty then
      raise exception 'Return exceeds sold qty.' using errcode = 'check_violation';
    end if;

    update public.sale_lines set returned = returned + qty where id = line.id;
    update public.product_variants
    set stock = stock + qty, updated_at = now()
    where id = line.variant_id;

    item_label := case when line.label <> '' then line.name || ' · ' || line.label else line.name end;
    insert into public.stock_moves (
      shop_id, variant_id, type, qty, item_label, source, note, user_name, moved_at
    )
    values (
      sale.shop_id, line.variant_id, 'return', qty, item_label,
      nullif(sale.customer, ''), 'Retour client ' || sale.code, p_user_name, now()
    );
  end loop;

  return sale;
end;
$$;

revoke all on function public.record_sale(uuid, text, text, text, text, integer, text, integer, text, jsonb)
  from public, anon;
grant execute on function public.record_sale(uuid, text, text, text, text, integer, text, integer, text, jsonb)
  to authenticated;
revoke all on function public.set_sale_cancelled(uuid, boolean) from public, anon;
grant execute on function public.set_sale_cancelled(uuid, boolean) to authenticated;
revoke all on function public.return_sale_items(uuid, jsonb, text) from public, anon;
grant execute on function public.return_sale_items(uuid, jsonb, text) to authenticated;

-- ------------------------------------------------------------------ RLS

alter table public.sales enable row level security;
alter table public.sale_lines enable row level security;

create policy "Owners manage sales" on public.sales
  for all to authenticated
  using ((select public.is_shop_owner(shop_id)))
  with check ((select public.is_shop_owner(shop_id)));

create policy "Owners manage sale lines" on public.sale_lines
  for all to authenticated
  using (
    (select public.is_shop_owner((select shop_id from public.sales where id = sale_id)))
  )
  with check (
    (select public.is_shop_owner((select shop_id from public.sales where id = sale_id)))
  );

create policy "Email code required" on public.sales
  as restrictive to authenticated using ((select public.second_factor_verified()));
create policy "Email code required" on public.sale_lines
  as restrictive to authenticated using ((select public.second_factor_verified()));

revoke all on public.sales, public.sale_lines from anon;
grant select, insert, update, delete on public.sales, public.sale_lines to authenticated;

-- GOLDSTOCK: suppliers, receptions and expenses (ADR 0008).
-- Receiving goods goes through receive_goods so stock, cost and supplier totals stay in sync.

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  contact text not null default '',
  phone text not null default '',
  city text not null default '',
  category text not null default '',
  total integer not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index suppliers_shop_id_idx on public.suppliers (shop_id);

create trigger suppliers_touch_updated_at before update on public.suppliers
  for each row execute function public.touch_updated_at();

create table public.receptions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  code text not null check (char_length(code) between 2 and 32),
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  supplier_name text not null,
  reference text not null default '',
  lines_count integer not null check (lines_count > 0),
  qty integer not null check (qty > 0),
  total integer not null check (total >= 0),
  user_name text not null,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (shop_id, code)
);

create index receptions_shop_id_received_at_idx on public.receptions (shop_id, received_at desc);

create table public.reception_lines (
  id uuid primary key default gen_random_uuid(),
  reception_id uuid not null references public.receptions (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  qty integer not null check (qty > 0),
  cost integer not null check (cost >= 0)
);

create index reception_lines_reception_id_idx on public.reception_lines (reception_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  code text not null check (char_length(code) between 2 and 32),
  day date not null,
  shop_name text not null,
  category text not null check (
    category in ('rent', 'utilities', 'salaries', 'transport', 'supplies', 'taxes', 'repairs', 'other')
  ),
  reason text not null check (char_length(reason) between 1 and 200),
  amount integer not null check (amount > 0),
  author text not null,
  pay text not null check (pay in ('cash', 'mtn', 'om', 'transfer')),
  note text not null default '',
  recorded_by text not null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (shop_id, code)
);

create index expenses_shop_id_day_idx on public.expenses (shop_id, day desc);

-- ------------------------------------------------------------------ RPCs

create or replace function public.receive_goods(
  p_shop_id uuid,
  p_code text,
  p_supplier_id uuid,
  p_reference text,
  p_user_name text,
  p_lines jsonb
)
returns public.receptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  reception public.receptions;
  supplier public.suppliers;
  line jsonb;
  v_id uuid;
  v_qty integer;
  v_cost integer;
  p_id uuid;
  item_label text;
  v_label text;
  p_name text;
  lines_count integer := 0;
  total_qty integer := 0;
  total_amount integer := 0;
begin
  if auth.uid() is null or not public.is_shop_owner(p_shop_id) or not public.second_factor_verified() then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Reception needs at least one line.' using errcode = 'check_violation';
  end if;

  select * into supplier from public.suppliers
  where id = p_supplier_id and shop_id = p_shop_id
  for update;
  if not found then
    raise exception 'Supplier not found.' using errcode = 'no_data_found';
  end if;

  for line in select * from jsonb_array_elements(p_lines)
  loop
    v_qty := (line ->> 'qty')::integer;
    v_cost := (line ->> 'cost')::integer;
    if v_qty is null or v_qty <= 0 or v_cost is null or v_cost < 0 then
      raise exception 'Invalid reception line.' using errcode = 'check_violation';
    end if;
    lines_count := lines_count + 1;
    total_qty := total_qty + v_qty;
    total_amount := total_amount + (v_qty * v_cost);
  end loop;

  insert into public.receptions (
    shop_id, code, supplier_id, supplier_name, reference, lines_count, qty, total, user_name
  )
  values (
    p_shop_id, p_code, supplier.id, supplier.name, coalesce(p_reference, ''),
    lines_count, total_qty, total_amount, p_user_name
  )
  returning * into reception;

  for line in select * from jsonb_array_elements(p_lines)
  loop
    v_id := (line ->> 'variant_id')::uuid;
    v_qty := (line ->> 'qty')::integer;
    v_cost := (line ->> 'cost')::integer;

    select v.label, p.id, p.name
      into v_label, p_id, p_name
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = v_id and p.shop_id = p_shop_id
    for update of v;

    if not found then
      raise exception 'Variant not found.' using errcode = 'no_data_found';
    end if;

    update public.product_variants
    set stock = stock + v_qty, cost = v_cost, updated_at = now()
    where id = v_id;

    insert into public.reception_lines (reception_id, product_id, variant_id, qty, cost)
    values (reception.id, p_id, v_id, v_qty, v_cost);

    item_label := case when coalesce(v_label, '') <> '' then p_name || ' · ' || v_label else p_name end;
    insert into public.stock_moves (
      shop_id, variant_id, type, qty, item_label, source, note, user_name, moved_at
    )
    values (
      p_shop_id, v_id, 'reception', v_qty, item_label, supplier.name,
      'Réception ' || reception.code, p_user_name, reception.received_at
    );
  end loop;

  update public.suppliers
  set total = total + total_amount, updated_at = now()
  where id = supplier.id;

  return reception;
end;
$$;

revoke all on function public.receive_goods(uuid, text, uuid, text, text, jsonb) from public, anon;
grant execute on function public.receive_goods(uuid, text, uuid, text, text, jsonb) to authenticated;

-- ------------------------------------------------------------------ RLS

alter table public.suppliers enable row level security;
alter table public.receptions enable row level security;
alter table public.reception_lines enable row level security;
alter table public.expenses enable row level security;

create policy "Owners manage suppliers" on public.suppliers
  for all to authenticated
  using ((select public.is_shop_owner(shop_id)))
  with check ((select public.is_shop_owner(shop_id)));

create policy "Owners manage receptions" on public.receptions
  for all to authenticated
  using ((select public.is_shop_owner(shop_id)))
  with check ((select public.is_shop_owner(shop_id)));

create policy "Owners manage reception lines" on public.reception_lines
  for all to authenticated
  using (
    (select public.is_shop_owner((select shop_id from public.receptions where id = reception_id)))
  )
  with check (
    (select public.is_shop_owner((select shop_id from public.receptions where id = reception_id)))
  );

create policy "Owners manage expenses" on public.expenses
  for all to authenticated
  using ((select public.is_shop_owner(shop_id)))
  with check ((select public.is_shop_owner(shop_id)));

create policy "Email code required" on public.suppliers
  as restrictive to authenticated using ((select public.second_factor_verified()));
create policy "Email code required" on public.receptions
  as restrictive to authenticated using ((select public.second_factor_verified()));
create policy "Email code required" on public.reception_lines
  as restrictive to authenticated using ((select public.second_factor_verified()));
create policy "Email code required" on public.expenses
  as restrictive to authenticated using ((select public.second_factor_verified()));

revoke all on public.suppliers, public.receptions, public.reception_lines, public.expenses from anon;
grant select, insert, update, delete on public.suppliers, public.receptions, public.reception_lines, public.expenses
  to authenticated;

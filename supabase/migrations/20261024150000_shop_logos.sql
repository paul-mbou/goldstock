-- Shop logos: one image per shop in the public `shop-logos` bucket, under a folder named after
-- the shop id. Public because the logo is printed on receipts and sent to customers.

alter table public.shops
  add column logo_path text check (logo_path is null or logo_path like id::text || '/%');

grant update (logo_path) on public.shops to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-logos', 'shop-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp']);

-- Upload, replace and delete need select + insert + update + delete on the owner's folder.
create policy "Owners manage their shop logos" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'shop-logos'
    and (storage.foldername(name))[1] in (select id::text from public.shops where owner_id = (select auth.uid()))
    and (select public.second_factor_verified())
  )
  with check (
    bucket_id = 'shop-logos'
    and (storage.foldername(name))[1] in (select id::text from public.shops where owner_id = (select auth.uid()))
    and (select public.second_factor_verified())
  );

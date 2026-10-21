-- Public spot catalog overrides and custom spots managed by administrators.
create table public.admin_spots (
  map_id text not null check (map_id in ('dust2','mirage','inferno','nuke','ancient','anubis','cache')),
  spot_id varchar(60) not null check (spot_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name varchar(80) not null check (char_length(btrim(name)) between 1 and 80),
  image_path text,
  image_cleared boolean not null default false,
  is_custom boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (map_id, spot_id),
  check (image_path is null or (char_length(image_path) between 1 and 500 and image_path like 'admin-spots/%'))
);

alter table public.admin_spots enable row level security;
revoke all on public.admin_spots from anon, authenticated;
grant select on public.admin_spots to anon, authenticated;
grant insert (map_id, spot_id, name, image_path, image_cleared, is_custom, updated_at)
  on public.admin_spots to authenticated;
grant update (name, image_path, image_cleared, is_custom, updated_at)
  on public.admin_spots to authenticated;

create policy admin_spots_public_read on public.admin_spots
  for select to anon, authenticated using (true);
create policy admin_spots_admin_insert on public.admin_spots
  for insert to authenticated with check ((select public.get_my_role()) = 'admin');
create policy admin_spots_admin_update on public.admin_spots
  for update to authenticated using ((select public.get_my_role()) = 'admin')
  with check ((select public.get_my_role()) = 'admin');

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('map-spot-images', 'map-spot-images', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy map_spot_images_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'map-spot-images');
create policy map_spot_images_admin_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'map-spot-images'
    and (storage.foldername(name))[1] = 'admin-spots'
    and (select public.get_my_role()) = 'admin'
  );
create policy map_spot_images_admin_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'map-spot-images'
    and (storage.foldername(name))[1] = 'admin-spots'
    and (select public.get_my_role()) = 'admin'
  );

-- Replace map callout spots with utilities grouped by type. Existing records
-- are pixels already and all are smokes unless explicitly changed later.
alter table public.utilities rename column spot_id to pixel_name;
alter table public.utilities drop column spot_name;
alter table public.utilities
  add column utility_type varchar(20) not null default 'smoke'
  check (utility_type in ('smoke', 'molotov', 'flashbang', 'he'));

drop index if exists public.utilities_map_id_idx;
create index utilities_map_type_id_idx
  on public.utilities(map_name, utility_type, id desc);

revoke insert (author_id, pixel_name, map_name, throw_type, player_position_image, aim_position_image)
  on public.utilities from authenticated;
grant insert (author_id, pixel_name, utility_type, map_name, throw_type, player_position_image, aim_position_image)
  on public.utilities to authenticated;

-- The old catalog and its uploaded callout images are no longer used.
drop policy if exists map_spot_images_public_read on storage.objects;
drop policy if exists map_spot_images_admin_insert on storage.objects;
drop policy if exists map_spot_images_admin_delete on storage.objects;
drop table if exists public.admin_spots;

-- Supabase protects storage.objects from direct SQL deletes. If the legacy
-- map-spot-images bucket exists, remove it through Dashboard > Storage after
-- confirming its files are no longer needed; bucket deletion removes its files.

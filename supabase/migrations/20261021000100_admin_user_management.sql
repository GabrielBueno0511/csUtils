-- Existing accounts retain administrative access; future accounts start as regular users.
alter table public.profiles
  add column role text not null default 'user'
    check (role in ('admin', 'user'));

update public.profiles set role = 'admin';
insert into public.profiles (id, name, role)
  select u.id,
    case when char_length(btrim(coalesce(u.raw_user_meta_data ->> 'name', ''))) >= 2
      then left(btrim(u.raw_user_meta_data ->> 'name'), 80) else 'Jogador' end,
    'admin'
  from auth.users u
  on conflict (id) do update set role = 'admin';

-- Keep the role private from ordinary profile reads. The public app only needs names.
revoke select on public.profiles from anon, authenticated;
grant select (id, name) on public.profiles to anon, authenticated;
grant all on public.profiles to service_role;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;
revoke all on function public.get_my_role() from public, anon;
grant execute on function public.get_my_role() to authenticated;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  phone text,
  name text,
  user_metadata jsonb,
  role text,
  created_at timestamptz,
  updated_at timestamptz,
  email_confirmed_at timestamptz,
  phone_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  is_anonymous boolean,
  spots_created bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Acesso restrito a administradores' using errcode = '42501';
  end if;

  return query
    select u.id, u.email::text, u.phone::text, coalesce(p.name, 'Jogador')::text,
      (u.raw_user_meta_data - 'password' - 'encrypted_password'), p.role, u.created_at, u.updated_at,
      u.email_confirmed_at, u.phone_confirmed_at, u.last_sign_in_at, u.is_anonymous,
      count(util.id)::bigint
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.utilities util on util.author_id = u.id
    group by u.id, u.email, u.phone, p.name, u.raw_user_meta_data, p.role
    order by u.created_at desc;
end;
$$;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_count bigint;
begin
  if public.get_my_role() is distinct from 'admin' then
    raise exception 'Acesso restrito a administradores' using errcode = '42501';
  end if;
  if new_role not in ('admin', 'user') then
    raise exception 'Papel inválido' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users u where u.id = target_user_id) then
    raise exception 'Usuário não encontrado' using errcode = 'P0002';
  end if;

  if new_role = 'user' then
    perform 1 from public.profiles p where p.role = 'admin' for update;
    select count(*) into admin_count from public.profiles p where p.role = 'admin';
    if admin_count <= 1 and exists (
      select 1 from public.profiles p where p.id = target_user_id and p.role = 'admin'
    ) then
      raise exception 'O projeto precisa manter ao menos um administrador' using errcode = '23514';
    end if;
  end if;

  update public.profiles set role = new_role where id = target_user_id;
end;
$$;
revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;


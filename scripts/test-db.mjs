import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Executes the actual migration against embedded PostgreSQL. Only managed Supabase
// schemas/functions are stubbed; application policies, grants and constraints are real.
const db = new PGlite();
let checks = 0;
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
async function query(sql) { return (await db.query(sql)).rows; }
async function count(sql, expected) { assert.equal(Number((await query(sql))[0].n), expected); checks++; }
async function denied(sql) {
  await db.exec('savepoint denied');
  let rejected = false;
  try { await db.exec(sql); } catch (error) { rejected = ['42501','23514','23503'].includes(error.code); }
  await db.exec('rollback to savepoint denied; release savepoint denied');
  assert.equal(rejected, true, 'Expected permission/constraint rejection'); checks++;
}
async function role(name, id = '') {
  await db.exec(`reset role; set local role ${name}; set local request.jwt.claim.sub = '${id}'`);
}
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(
      id uuid primary key, email text, phone text, raw_user_meta_data jsonb default '{}',
      created_at timestamptz default now(), updated_at timestamptz default now(),
      email_confirmed_at timestamptz, phone_confirmed_at timestamptz,
      last_sign_in_at timestamptz, is_anonymous boolean default false
    );
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    create function storage.foldername(text) returns text[] language sql immutable as
      $$select (string_to_array($1, '/'))[1:array_length(string_to_array($1, '/'), 1)-1]$$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id integer generated always as identity primary key, bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant usage on schema public, auth, storage to anon, authenticated;
    grant all on storage.objects to authenticated;
    grant usage on sequence storage.objects_id_seq to authenticated;
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261020000100_initial.sql', import.meta.url), 'utf8'));
  await db.exec('begin');
  await db.exec(`insert into auth.users(id, email, raw_user_meta_data) values
    ('${alice}', 'alice@example.com', '{"name":"Alice"}'),
    ('${bob}', 'bob@example.com', '{"name":"Bob"}')`);
  await count('select count(*) n from public.profiles', 2);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261021000100_admin_user_management.sql', import.meta.url), 'utf8'));
  await count("select count(*) n from public.profiles where role = 'admin'", 2);
  await role('anon');
  await count('select count(*) n from public.profiles', 2);
  await denied('select public.get_my_role()');
  await role('authenticated', alice);
  const listedUsers = await query('select * from public.admin_list_users()');
  assert.equal(listedUsers.length, 2);
  assert.equal(listedUsers[0].role, 'admin');
  assert.equal(listedUsers[0].spots_created, 0);
  assert.equal('encrypted_password' in listedUsers[0], false);
  checks++;
  await db.exec(`select public.admin_set_user_role('${bob}', 'user')`);
  await db.exec('reset role');
  await count(`select count(*) n from public.profiles where id='${bob}' and role='user'`, 1);
  await role('authenticated', alice);
  await denied(`select public.admin_set_user_role('${alice}', 'user')`);
  await db.exec(`select public.admin_set_user_role('${bob}', 'admin')`);
  await db.exec('reset role');
  await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values ('33333333-3333-4333-8333-333333333333','charlie@example.com','{"name":"Charlie"}')`);
  await count("select count(*) n from public.profiles where id='33333333-3333-4333-8333-333333333333' and role='user'", 1);
  await role('authenticated', '33333333-3333-4333-8333-333333333333');
  await denied('select * from public.admin_list_users()');
  await denied(`select public.admin_set_user_role('${alice}', 'user')`);
  await db.exec('reset role');
  await count("select count(*) n from public.profiles where id='33333333-3333-4333-8333-333333333333' and role='user'", 1);
  await role('authenticated', '33333333-3333-4333-8333-333333333333');
  await denied(`insert into public.utilities(spot_id) values ('blocked')`);
  await role('authenticated', alice);
  await db.exec(`insert into storage.objects(bucket_id,name) values ('utility-images','${alice}/position.png'),('utility-images','${alice}/aim.png')`);
  await denied(`insert into storage.objects(bucket_id,name) values ('utility-images','${bob}/stolen.png')`);
  const columns = 'author_id,spot_id,spot_name,map_name,throw_type,player_position_image,aim_position_image';
  const values = `'${alice}','Smoke CT','ct','mirage','normal','${alice}/position.png','${alice}/aim.png'`;
  const utility = (await query(`insert into public.utilities(${columns}) values (${values}) returning id`))[0];
  await db.exec(`insert into public.utility_favorites values ('${alice}',${utility.id})`);
  await denied(`insert into public.utility_favorites values ('${bob}',${utility.id})`);
  await db.exec(`delete from storage.objects where name='${alice}/position.png'`);
  await count('select count(*) n from storage.objects', 2);
  await denied(`update public.utilities set author_id='${bob}' where id=${utility.id}`);
  await role('authenticated', bob);
  await count('select count(*) n from public.utilities', 1);
  await count('select count(*) n from public.utility_favorites', 0);
  await denied(`insert into public.utilities(${columns}) values (${values})`);
  await denied(`insert into public.utilities(${columns}) values ('${bob}','Smoke','ct','mirage','normal','${bob}/missing.png','${bob}/missing2.png')`);
  await db.exec(`delete from public.utilities where id=${utility.id}`);
  await count('select count(*) n from public.utilities', 1);
  await db.exec('delete from public.utility_favorites');
  await role('authenticated', alice);
  await count('select count(*) n from public.utility_favorites', 1);
  await role('authenticated', bob);
  await db.exec(`insert into public.utility_favorites values ('${bob}',${utility.id})`);
  await count('select count(*) n from public.utility_favorites', 1);
  await role('anon');
  await count('select count(*) n from public.utilities', 1);
  await denied(`delete from public.utilities where id=${utility.id}`);
  await role('authenticated', alice);
  await db.exec(`delete from public.utilities where id=${utility.id}`);
  await count('select count(*) n from public.utilities', 0);
  await db.exec('delete from storage.objects');
  await count('select count(*) n from storage.objects', 0);
  await role('authenticated', bob);
  await count('select count(*) n from public.utility_favorites', 0);
  await db.exec('rollback');
  console.log(`${checks} verificações PostgreSQL passaram: migração, leitura pública, autoria, isolamento de favoritos e Storage.`);
} finally { await db.close(); }

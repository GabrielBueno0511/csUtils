import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!args.includes('--db')) throw new Error('Informe --db /caminho/app.db. Sem --apply apenas inspeciona o arquivo.');
const db = new DatabaseSync(resolve(option('--db')), { readOnly: true });
const allowedMaps = new Set(['dust2','mirage','inferno','nuke','ancient','anubis','cache']);
const rows = db.prepare(`select u.*, ua.user_id as legacy_user_id, p.name as legacy_author_name
  from utilities u left join utility_authors ua on ua.utility_id=u.id left join users p on p.id=ua.user_id order by u.id`).all();
const favorites = db.prepare('select user_id,utility_id from utility_favorites').all();
db.close();
const selected = rows.filter(row => allowedMaps.has(row.map_name));
console.log(`${selected.length} utilitárias elegíveis; ${rows.length-selected.length} de mapas removidos ficam apenas no SQLite.`);
console.log(`${favorites.length} favoritos existentes. Contas/senhas não são copiadas. O SQLite é somente leitura.`);
if (!args.includes('--apply')) {
  console.log('Simulação concluída. Para importar, configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY e execute com --apply.');
  process.exit(0);
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY somente neste processo administrativo.');
const client = createClient(url,key,{ auth:{ persistSession:false, autoRefreshToken:false } });
const mapping = args.includes('--users') ? JSON.parse(readFileSync(option('--users'),'utf8')) : {};
for (const id of Object.values(mapping)) {
  const { data, error } = await client.auth.admin.getUserById(id);
  if (error || !data.user) throw new Error('Mapeamento contém uma conta Supabase inexistente.');
}
function check(error) { if (error) throw new Error(`Falha na importação: ${error.code ?? error.status ?? 'erro'}. Confira o projeto e a migração SQL.`); }
async function image(value,path) {
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(value)) throw new Error('Imagem legada incompatível. Converta para PNG, JPEG ou WebP em base64 antes de importar.');
  const response = await fetch(value);
  const blob = await response.blob();
  if (blob.size > 5242880) throw new Error('Imagem legada excede 5 MB. Reduza o tamanho antes de importar.');
  const extension = blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1];
  const fullPath = `${path}.${extension}`;
  const { error } = await client.storage.from('utility-images').upload(fullPath,blob,{contentType:blob.type,upsert:true});
  check(error);return fullPath;
}
for (const row of selected) {
  const { data: existing, error: lookupError } = await client.from('utilities').select('id').eq('legacy_id',row.id).maybeSingle();
  check(lookupError);
  if (existing) continue; // Safe to resume; does not overwrite edits or reassigned ownership.
  const owner = mapping[String(row.legacy_user_id)] ?? null;
  const folder = owner ?? 'legacy';
  const position = await image(row.player_position_image,`${folder}/import-${row.id}-position`);
  const aim = await image(row.aim_position_image,`${folder}/import-${row.id}-aim`);
  const { error } = await client.from('utilities').insert({ legacy_id:row.id, author_id:owner,
    legacy_author_name:row.legacy_author_name, spot_id:row.spot_id, spot_name:row.spot_name,
    map_name:row.map_name, throw_type:row.throw_type, player_position_image:position, aim_position_image:aim });
  check(error);
}
let restored = 0;
for (const favorite of favorites) {
  const owner = mapping[String(favorite.user_id)];
  if (!owner) continue;
  const { data: utility, error: lookupError } = await client.from('utilities').select('id').eq('legacy_id',favorite.utility_id).maybeSingle();
  check(lookupError);if (!utility) continue;
  const { error } = await client.from('utility_favorites').upsert({user_id:owner,utility_id:utility.id},{onConflict:'user_id,utility_id',ignoreDuplicates:true});
  check(error);restored++;
}
console.log(`Importação concluída; ${restored} favoritos mapeados. Confira as calls antigas que foram renomeadas antes de publicar.`);

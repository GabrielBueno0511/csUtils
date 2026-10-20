import './configure.mjs';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const config = JSON.parse(readFileSync(new URL('../public/app-config.json', import.meta.url), 'utf8'));
if (config.backend !== 'supabase') throw new Error('Configure APP_BACKEND=supabase antes de testar a conexão.');
const client = createClient(config.supabaseUrl, config.supabasePublishableKey,
  { auth: { persistSession: false, autoRefreshToken: false }, global: {fetch: (input,init) => fetch(input,{...init,signal:AbortSignal.timeout(20000)})} });
const { error: utilitiesError } = await client.from('utilities')
  .select('id,author_id,spot_id,spot_name,map_name,throw_type,player_position_image,aim_position_image,legacy_author_name,profiles(name)')
  .eq('map_name','mirage').limit(1);
if (utilitiesError) throw new Error(`Falha ao ler utilitárias: ${utilitiesError.code} ${utilitiesError.message}`);
console.log('Banco: leitura pública de utilitárias e relação com autores funcionando.');
const { error: favoritesError } = await client.from('utility_favorites').select('utility_id').limit(1);
if (!favoritesError || favoritesError.code !== '42501') throw new Error('Acesso anônimo a favoritos não foi bloqueado como esperado.');
console.log('Permissões: leitura anônima de favoritos bloqueada.');
const auth = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
  headers: { apikey:config.supabasePublishableKey }, signal:AbortSignal.timeout(20000),
});
if (!auth.ok) throw new Error(`Auth indisponível: HTTP ${auth.status}`);
const settings = await auth.json();
if (!settings.external?.email) throw new Error('Login por e-mail não está habilitado no projeto.');
console.log('Auth: login por e-mail habilitado e API acessível.');
console.log('Conexão validada sem criar usuários, enviar e-mails ou alterar dados.');

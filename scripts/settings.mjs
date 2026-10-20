export function buildSettings(env) {
  const backend = env.APP_BACKEND || (env.VERCEL ? 'supabase' : 'api');
  if (!['api', 'supabase'].includes(backend)) throw new Error('APP_BACKEND deve ser api ou supabase.');
  if (env.VERCEL && backend !== 'supabase') {
    throw new Error('Na Vercel configure APP_BACKEND=supabase. A API Python é usada apenas no modo local legado.');
  }
  const config = { backend, supabaseUrl: '', supabasePublishableKey: '' };
  if (backend === 'supabase') {
    config.supabaseUrl = env.SUPABASE_URL || '';
    config.supabasePublishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || '';
    const url = new URL(config.supabaseUrl);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
      throw new Error('Use HTTPS no Supabase remoto ou HTTP somente no localhost.');
    }
    const key = config.supabasePublishableKey;
    if (!key) throw new Error('Configure SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_ANON_KEY).');
    if (!key.startsWith('sb_publishable_')) {
      let role;
      try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch {}
      if (role !== 'anon') throw new Error('Use somente chave publishable/anon. Chaves secret/service_role nunca podem ir ao frontend.');
    }
  }
  return config;
}

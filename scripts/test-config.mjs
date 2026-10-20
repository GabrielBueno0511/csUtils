import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSettings } from './settings.mjs';
const token = role => `header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
const base = {APP_BACKEND:'supabase',SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'};
test('defaults to Python API locally and requires Supabase credentials on Vercel', () => {
  assert.equal(buildSettings({}).backend,'api');
  assert.throws(() => buildSettings({VERCEL:'1',APP_BACKEND:'api'}));
  assert.throws(() => buildSettings({VERCEL:'1'}));
  assert.equal(buildSettings({...base,VERCEL:'1'}).backend,'supabase');
});
test('only public keys and local HTTP endpoints are allowed', () => {
  assert.equal(buildSettings({...base,SUPABASE_PUBLISHABLE_KEY:token('anon')}).backend,'supabase');
  assert.equal(buildSettings({...base,SUPABASE_URL:'http://127.0.0.1:54321'}).backend,'supabase');
  for (const key of [token('service_role'),'sb_secret_dangerous','not-a-public-key','']) {
    assert.throws(() => buildSettings({...base,SUPABASE_PUBLISHABLE_KEY:key}));
  }
  assert.throws(() => buildSettings({...base,SUPABASE_URL:'http://remote.example.com'}));
});
test('administrative credentials are never included in the browser config', () => {
  const settings = buildSettings({...base,SUPABASE_SERVICE_ROLE_KEY:'private-secret',DATABASE_URL:'private-database'});
  assert.deepEqual(Object.keys(settings),['backend','supabaseUrl','supabasePublishableKey']);
  assert.equal(JSON.stringify(settings).includes('private-'),false);
});

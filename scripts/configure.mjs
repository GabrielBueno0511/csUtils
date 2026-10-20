import { buildSettings } from './settings.mjs';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Shell/Vercel variables take precedence; .env.local takes precedence over .env.
for (const file of ['.env.local', '.env']) {
  const path = resolve(root, file);
  if (existsSync(path)) process.loadEnvFile(path);
}
const config = buildSettings(process.env);
writeFileSync(resolve(root, 'public/app-config.json'), JSON.stringify(config, null, 2) + '\n');
console.log(`Backend configurado: ${config.backend}`);

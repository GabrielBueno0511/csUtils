import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { APP_SETTINGS, validateSettings } from './app/shared/config/app-settings';

async function start(): Promise<void> {
  const response = await fetch('/app-config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível carregar a configuração da aplicação.');
  const settings = validateSettings(await response.json());
  await bootstrapApplication(App, {
    ...appConfig,
    providers: [...appConfig.providers, { provide: APP_SETTINGS, useValue: settings }],
  });
}

start().catch(() => {
  document.body.textContent = 'Não foi possível iniciar o CS Utils. Verifique a configuração e recarregue a página.';
});

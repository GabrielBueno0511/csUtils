import { InjectionToken } from '@angular/core';

export interface AppSettings {
  backend: 'api' | 'supabase';
  supabaseUrl: string;
  supabasePublishableKey: string;
}

export const APP_SETTINGS = new InjectionToken<AppSettings>('APP_SETTINGS', {
  providedIn: 'root',
  factory: () => ({ backend: 'api', supabaseUrl: '', supabasePublishableKey: '' }),
});

export function validateSettings(value: unknown): AppSettings {
  const config = value as Partial<AppSettings> | null;
  if (!config || !['api', 'supabase'].includes(config.backend ?? '')) {
    throw new Error('Configuração de backend inválida.');
  }
  if (config.backend === 'supabase') {
    const url = new URL(config.supabaseUrl ?? '');
    if (!['https:', 'http:'].includes(url.protocol) || !config.supabasePublishableKey) {
      throw new Error('Configure a URL e a chave pública do Supabase.');
    }
  }
  return {
    backend: config.backend as AppSettings['backend'],
    supabaseUrl: config.supabaseUrl ?? '',
    supabasePublishableKey: config.supabasePublishableKey ?? '',
  };
}

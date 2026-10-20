import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { APP_SETTINGS } from '../config/app-settings';
import type { AuthResponse, AuthUser } from './auth.service';
import type { UtilityDto } from './utility.service';

const BUCKET = 'utility-images';
const PAGE_SIZE = 500;

interface UtilityRow {
  id: number;
  author_id: string | null;
  spot_id: string;
  spot_name: string;
  map_name: string;
  throw_type: string;
  player_position_image: string;
  aim_position_image: string;
  profiles: { name: string } | null;
  legacy_author_name?: string | null;
}
const UTILITY_COLUMNS = 'id,author_id,spot_id,spot_name,map_name,throw_type,player_position_image,aim_position_image,legacy_author_name,profiles(name)';

@Injectable({ providedIn: 'root' })
export class SupabaseService implements OnDestroy {
  private readonly settings = inject(APP_SETTINGS);
  readonly enabled = this.settings.backend === 'supabase';
  private instance?: SupabaseClient;
  private unsubscribeAuth?: () => void;

  private get client(): SupabaseClient {
    return this.instance ??= createClient(this.settings.supabaseUrl, this.settings.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: (input, init) => fetch(input, {
        ...init,
        signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
      }) },
    });
  }

  watchAuth(listener: (user: AuthUser | null) => void): void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(session ? this.authUser(session.user) : null);
    });
    this.unsubscribeAuth = () => data.subscription.unsubscribe();
  }

  ngOnDestroy(): void { this.unsubscribeAuth?.(); }

  private authUser(user: User): AuthUser {
    return { id: user.id, email: user.email ?? '', name: user.user_metadata['name'] ?? 'Jogador' };
  }

  private fail(error: { message: string; status?: number; code?: string } | null): void {
    if (!error) return;
    const messages: Record<string, string> = {
      invalid_credentials: 'E-mail ou senha incorretos.',
      email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
      user_already_exists: 'Já existe uma conta com este e-mail.',
      email_exists: 'Já existe uma conta com este e-mail. Entre ou use a opção de recuperar senha.',
      invalid_email: 'Confira se o endereço de e-mail foi digitado corretamente.',
      weak_password: 'Use uma senha mais forte, com pelo menos 10 caracteres.',
      over_email_send_rate_limit: 'Foram enviados muitos pedidos em pouco tempo. Aguarde alguns minutos antes de tentar novamente.',
      signup_disabled: 'O cadastro está temporariamente indisponível. Tente novamente mais tarde.',
      '23505': 'Este registro já existe.',
      '42501': 'Você não tem permissão para realizar esta ação.',
    };
    throw new HttpErrorResponse({ status: error.status ?? 400,
      error: { error: messages[error.code ?? ''] ?? 'Não foi possível concluir a operação. Confira os dados e tente novamente.' } });
  }

  async restore(): Promise<AuthResponse | null> {
    const { data, error } = await this.client.auth.getSession();
    this.fail(error);
    return data.session ? { user: this.authUser(data.session.user) } : null;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await this.client.auth.signInWithPassword({ email: email.trim(), password });
    this.fail(error);
    return { user: this.authUser(data.user!) };
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await this.client.auth.signUp({ email: email.trim(), password,
      options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin + '/login' } });
    this.fail(error);
    return data.session ? { user: this.authUser(data.session.user) } : { user: null, confirmationRequired: true };
  }

  async logout(): Promise<void> {
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    this.fail(error);
  }

  private async requireUserId(): Promise<string> {
    const { data, error } = await this.client.auth.getSession();
    this.fail(error);
    if (!data.session) throw new HttpErrorResponse({ status: 401, error: { error: 'Entre na sua conta para continuar.' } });
    return data.session.user.id;
  }

  private dto(row: UtilityRow): UtilityDto {
    return { id: row.id, author_id: row.author_id, author_name: row.profiles?.name ?? row.legacy_author_name ?? null,
      spot_id: row.spot_id, spot_name: row.spot_name, map_name: row.map_name, throw_type: row.throw_type,
      player_position_image: this.client.storage.from(BUCKET).getPublicUrl(row.player_position_image).data.publicUrl,
      aim_position_image: this.client.storage.from(BUCKET).getPublicUrl(row.aim_position_image).data.publicUrl };
  }

  async utilities(mapName: string): Promise<UtilityDto[]> {
    const rows: UtilityDto[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await this.client.from('utilities').select(UTILITY_COLUMNS)
        .eq('map_name', mapName).order('id', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
      this.fail(error);
      const page = data as unknown as UtilityRow[];
      rows.push(...page.map(row => this.dto(row)));
      if (page.length < PAGE_SIZE) return rows;
    }
  }

  async createUtility(utility: UtilityDto): Promise<UtilityDto> {
    const userId = await this.requireUserId();
    const uploaded: string[] = [];
    try {
      for (const image of [utility.player_position_image, utility.aim_position_image]) {
        const { blob, extension } = await this.imageBlob(image);
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await this.client.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
        this.fail(error);
        uploaded.push(path);
      }
      const { data, error } = await this.client.from('utilities').insert({
        author_id: userId, spot_id: utility.spot_id, spot_name: utility.spot_name,
        map_name: utility.map_name, throw_type: utility.throw_type,
        player_position_image: uploaded[0], aim_position_image: uploaded[1],
      }).select(UTILITY_COLUMNS).single();
      this.fail(error);
      return this.dto(data as unknown as UtilityRow);
    } catch (error) {
      await this.removeImages(uploaded);
      throw error;
    }
  }

  private async imageBlob(value: string): Promise<{ blob: Blob; extension: string }> {
    const type = /^data:(image\/(?:png|jpeg|webp));base64,/.exec(value)?.[1];
    if (!type || value.length > 7_000_000) throw new HttpErrorResponse({ status: 400,
      error: { error: 'Use imagens PNG, JPEG ou WebP de até 5 MB.' } });
    const blob = await (await fetch(value)).blob();
    if (blob.size > 5 * 1024 * 1024) throw new HttpErrorResponse({ status: 400,
      error: { error: 'Cada imagem deve ter no máximo 5 MB.' } });
    return { blob, extension: type === 'image/jpeg' ? 'jpg' : type.split('/')[1] };
  }

  private async removeImages(paths: string[]): Promise<void> {
    if (!paths.length) return;
    try {
      const { error } = await this.client.storage.from(BUCKET).remove(paths);
      if (error) console.warn('Não foi possível remover imagens sem referência do Storage.');
    } catch { console.warn('Não foi possível remover imagens sem referência do Storage.'); }
  }

  async deleteUtility(id: string): Promise<void> {
    const userId = await this.requireUserId();
    const { data, error } = await this.client.from('utilities').delete().eq('id', id).eq('author_id', userId)
      .select('id,player_position_image,aim_position_image').single();
    this.fail(error);
    if (!data) throw new HttpErrorResponse({ status: 404, error: { error: 'Utilitária não encontrada.' } });
    await this.removeImages([data.player_position_image, data.aim_position_image]);
  }

  async favoriteIds(): Promise<number[]> {
    const userId = await this.requireUserId();
    const ids: number[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await this.client.from('utility_favorites').select('utility_id')
        .eq('user_id', userId).order('utility_id').range(offset, offset + PAGE_SIZE - 1);
      this.fail(error);
      ids.push(...data!.map(row => row.utility_id as number));
      if (data!.length < PAGE_SIZE) return ids;
    }
  }

  async favorites(): Promise<UtilityDto[]> {
    const userId = await this.requireUserId();
    const rows: UtilityDto[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await this.client.from('utility_favorites')
        .select(`utility_id,utilities(${UTILITY_COLUMNS})`).eq('user_id', userId)
        .order('utility_id', { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
      this.fail(error);
      for (const row of data!) {
        if (row.utilities) rows.push(this.dto(row.utilities as unknown as UtilityRow));
      }
      if (data!.length < PAGE_SIZE) return rows;
    }
  }

  async setFavorite(id: number, favorite: boolean): Promise<void> {
    const userId = await this.requireUserId();
    const request = favorite
      ? this.client.from('utility_favorites').upsert({ user_id: userId, utility_id: id }, { onConflict: 'user_id,utility_id', ignoreDuplicates: true })
      : this.client.from('utility_favorites').delete().eq('user_id', userId).eq('utility_id', id);
    const { error } = await request;
    this.fail(error);
  }
}

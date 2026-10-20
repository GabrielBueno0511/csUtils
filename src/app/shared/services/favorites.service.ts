import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, finalize, tap, timeout } from 'rxjs';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { UtilityDto } from './utility.service';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly owner = signal<number | string | null>(null);
  private readonly savedIds = signal<number[]>([]);
  private readonly pending = signal<number[]>([]);
  readonly ids = computed(() => this.owner() === this.auth.user()?.id ? this.savedIds() : []);
  readonly error = signal('');
  readonly loading = signal(false);

  constructor() {
    effect(onCleanup => {
      const userId = this.auth.user()?.id;
      this.owner.set(userId ?? null);
      this.savedIds.set([]);
      this.pending.set([]);
      this.error.set('');
      this.loading.set(!!userId);
      if (!userId) return;
      const request = this.supabase.enabled ? defer(() => this.supabase.favoriteIds())
        : this.http.get<number[]>('/api/utilities/favorites/ids', { transferCache: false }).pipe(timeout(15000));
      const subscription = request.subscribe({
        next: ids => { this.savedIds.set(ids); this.loading.set(false); },
        error: () => { this.error.set('Não foi possível carregar os favoritos.'); this.loading.set(false); },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  isFavorite(id: number): boolean { return this.ids().includes(id); }
  isBusy(id: number): boolean { return this.pending().includes(id); }

  list(): Observable<UtilityDto[]> {
    if (this.supabase.enabled) return defer(() => this.supabase.favorites());
    return this.http.get<UtilityDto[]>('/api/utilities/favorites', { transferCache: false }).pipe(timeout(15000));
  }

  setFavorite(id: number, favorite: boolean): Observable<void> {
    const userId = this.auth.user()?.id;
    this.pending.update(ids => [...ids, id]);
    this.error.set('');
    const url = `/api/utilities/${id}/favorite`;
    const request = this.supabase.enabled ? defer(() => this.supabase.setFavorite(id, favorite)) : favorite ? this.http.put<void>(url, {}) : this.http.delete<void>(url, { body: {} });
    return request.pipe(timeout(15000), tap(() => {
      if (this.auth.user()?.id !== userId || this.owner() !== userId) return;
      this.savedIds.update(ids => favorite ? [...new Set([...ids, id])] : ids.filter(value => value !== id));
    }), finalize(() => {
      if (this.auth.user()?.id === userId) this.pending.update(ids => ids.filter(value => value !== id));
    }));
  }
}

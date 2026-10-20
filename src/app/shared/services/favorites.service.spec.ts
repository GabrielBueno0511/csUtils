import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService, AuthUser } from './auth.service';
import { FavoritesService } from './favorites.service';

const player = { id: 1, name: 'Jogador', email: 'player@example.com' };
describe('FavoritesService', () => {
  let favorites: FavoritesService;
  let http: HttpTestingController;
  const user = signal<AuthUser | null>(null);
  beforeEach(() => {
    user.set(null);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { user } },
    ] });
    favorites = TestBed.inject(FavoritesService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });
  afterEach(() => http.verify());

  it('loads per-account favorites and clears immediately on logout or account change', () => {
    user.set(player);
    TestBed.tick();
    http.expectOne('/api/utilities/favorites/ids').flush([5]);
    expect(favorites.isFavorite(5)).toBe(true);
    user.set({ ...player, id: 2 });
    expect(favorites.ids()).toEqual([]);
    TestBed.tick();
    http.expectOne('/api/utilities/favorites/ids').flush([9]);
    expect(favorites.ids()).toEqual([9]);
    user.set(null);
    expect(favorites.ids()).toEqual([]);
    TestBed.tick();
    http.expectNone('/api/utilities/favorites/ids');
  });

  it('updates favorite status only after successful writes and preserves state on failure', () => {
    user.set(player);
    TestBed.tick();
    http.expectOne('/api/utilities/favorites/ids').flush([]);
    favorites.setFavorite(5, true).subscribe();
    expect(favorites.isBusy(5)).toBe(true);
    expect(favorites.isFavorite(5)).toBe(false);
    const add = http.expectOne('/api/utilities/5/favorite');
    expect(add.request.method).toBe('PUT');
    add.flush(null);
    expect(favorites.isFavorite(5)).toBe(true);
    expect(favorites.isBusy(5)).toBe(false);
    favorites.setFavorite(5, false).subscribe({ error: () => {} });
    const failed = http.expectOne('/api/utilities/5/favorite');
    expect(failed.request.body).toEqual({});
    failed.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(favorites.isFavorite(5)).toBe(true);
    favorites.setFavorite(5, false).subscribe();
    http.expectOne('/api/utilities/5/favorite').flush(null);
    expect(favorites.isFavorite(5)).toBe(false);
  });

  it('cancels a previous account request when the account changes', () => {
    user.set(player);
    TestBed.tick();
    const previous = http.expectOne('/api/utilities/favorites/ids');
    user.set({ ...player, id: 2 });
    TestBed.tick();
    expect(previous.cancelled).toBe(true);
    http.expectOne('/api/utilities/favorites/ids').flush([9]);
    expect(favorites.ids()).toEqual([9]);
  });
});

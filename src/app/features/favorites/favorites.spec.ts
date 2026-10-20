import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { AuthService, AuthUser } from '../../shared/services/auth.service';
import { FavoritesService } from '../../shared/services/favorites.service';
import { FavoritesComponent } from './favorites';

const saved = { id: 8, map_name: 'mirage', spot_name: 'janela', spot_id: 'Pixel janela', throw_type: 'jump-throw',
  author_name: 'Criador', player_position_image: 'position.png', aim_position_image: 'aim.png' };
describe('Favorites panel', () => {
  const user = signal<AuthUser | null>(null);
  let fixture: ComponentFixture<FavoritesComponent>;
  let element: HTMLElement;
  let deletion: Subject<void>;
  let list: ReturnType<typeof vi.fn>;
  let setFavorite: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    user.set(null);
    deletion = new Subject<void>();
    list = vi.fn(() => of([saved]));
    setFavorite = vi.fn(() => deletion);
    await TestBed.configureTestingModule({ imports: [FavoritesComponent], providers: [provideRouter([]),
      { provide: AuthService, useValue: { user } },
      { provide: FavoritesService, useValue: { list, setFavorite } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(FavoritesComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });
  function login() {
    user.set({ id: 1, name: 'Jogador', email: 'player@example.com' });
    fixture.detectChanges();
  }

  it('requires login, displays the saved images directly and clears them on logout', () => {
    expect(list).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Entrar para ver favoritos');
    login();
    expect(element.textContent).toContain('Pixel janela');
    expect(element.querySelectorAll('.favorite-images img')).toHaveLength(2);
    expect(element.querySelector('footer a')?.getAttribute('href')).toBe('/map/mirage/spot/janela');
    user.set(null);
    fixture.detectChanges();
    expect(element.querySelectorAll('.favorite-card')).toHaveLength(0);
  });

  it('keeps a favorite when removal fails and allows trying again', () => {
    login();
    element.querySelector<HTMLButtonElement>('.favorite-button')!.click();
    fixture.detectChanges();
    expect(setFavorite).toHaveBeenCalledWith(8, false);
    expect(element.querySelector<HTMLButtonElement>('.favorite-button')!.disabled).toBe(true);
    deletion.error({ error: { error: 'Falha ao remover.' } });
    fixture.detectChanges();
    expect(element.querySelectorAll('.favorite-card')).toHaveLength(1);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Falha ao remover');
    expect(element.querySelector<HTMLButtonElement>('.favorite-button')!.disabled).toBe(false);
  });

  it('removes a favorite from the panel after success without deleting the spot', () => {
    login();
    element.querySelector<HTMLButtonElement>('.favorite-button')!.click();
    expect(element.querySelectorAll('.favorite-card')).toHaveLength(1);
    deletion.next();
    deletion.complete();
    fixture.detectChanges();
    expect(element.querySelectorAll('.favorite-card')).toHaveLength(0);
    expect(element.textContent).toContain('Ainda não há favoritos.');
  });
});

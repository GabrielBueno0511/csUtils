import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { FavoritesService } from '../../shared/services/favorites.service';
import { AuthService, AuthUser } from '../../shared/services/auth.service';
import { UtilityService } from '../../shared/services/utility.service';
import { SpotUtilsComponent } from './spot-utils';

const base = { map_name: 'mirage', spot_name: 'janela', player_position_image: '', aim_position_image: '' };
const utilities = [
  { ...base, id: 1, spot_id: 'Smoke Rápida', author_id: 11, author_name: 'João', throw_type: 'jump-throw' },
  { ...base, id: 2, spot_id: 'Smoke Segura', author_id: 22, author_name: 'Maria', throw_type: 'normal' },
  { ...base, id: 3, spot_id: 'Smoke Antiga', author_name: null, throw_type: 'jumpthrow' },
  { ...base, id: 4, spot_name: 'fundo', spot_id: 'Outro spot', author_id: 11, author_name: 'João', throw_type: 'jump-throw' },
];

describe('Spot filters', () => {
  const loggedInUser = signal<AuthUser | null>(null);
  let deletion: Subject<void>;
  let deleteRequest: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<SpotUtilsComponent>;
  let element: HTMLElement;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  beforeEach(async () => {
    loggedInUser.set(null);
    deletion = new Subject<void>();
    deleteRequest = vi.fn(() => deletion);
    params = new BehaviorSubject(convertToParamMap({ mapId: 'mirage', spotNameId: 'janela' }));
    await TestBed.configureTestingModule({
      imports: [SpotUtilsComponent],
      providers: [provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
        { provide: FavoritesService, useValue: { loading: signal(false), error: signal(''), isFavorite: () => false, isBusy: () => false, setFavorite: vi.fn(() => of(undefined)) } },
        { provide: AuthService, useValue: { user: loggedInUser } },
        { provide: UtilityService, useValue: { getUtilitiesByMap: () => of(utilities), deleteUtility: deleteRequest } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SpotUtilsComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });
  async function filter(id: string, value: string) {
    const field = element.querySelector<HTMLInputElement | HTMLSelectElement>(id)!;
    field.value = value;
    field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }
  const cards = () => [...element.querySelectorAll('.util-card__identifier')].map(card => card.textContent?.trim());

  it('combines partial author, name and throw filters ignoring accents and case', async () => {
    expect(cards()).toHaveLength(3);
    await filter('#filter-author', ' JOAO ');
    await filter('#filter-name', 'rapida');
    await filter('#filter-throw', 'jump-throw');
    expect(cards()).toEqual(['Smoke Rápida']);
    expect(element.querySelector('[aria-live]')?.textContent).toContain('1 de 3 spots');
    await filter('#filter-throw', 'normal');
    expect(cards()).toHaveLength(0);
    expect(element.textContent).toContain('Nenhum spot corresponde aos filtros');
  });

  it('clears filters and includes old spots without an author or with legacy throws', async () => {
    await filter('#filter-throw', 'jumpthrow');
    expect(cards()).toEqual(['Smoke Antiga']);
    await filter('#filter-author', 'Maria');
    expect(cards()).toHaveLength(0);
    element.querySelector<HTMLButtonElement>('.spot-filters button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(cards()).toHaveLength(3);
    expect(element.querySelector<HTMLInputElement>('#filter-author')!.value).toBe('');
  });

  it('resets searches when navigating to another position', async () => {
    await filter('#filter-author', 'Maria');
    params.next(convertToParamMap({ mapId: 'mirage', spotNameId: 'fundo' }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(cards()).toEqual(['Outro spot']);
  });

  it('offers deletion only for the logged-in creator, matched by ID', () => {
    expect(element.querySelectorAll('.util-card__delete')).toHaveLength(0);
    loggedInUser.set({ id: 22, name: 'João', email: 'other@example.com' });
    fixture.detectChanges();
    expect(element.querySelector('#util-card-1 .util-card__delete')).toBeNull();
    expect(element.querySelector('#util-card-2 .util-card__delete')).not.toBeNull();
    expect(element.querySelector('#util-card-3 .util-card__delete')).toBeNull();
  });

  it('requires confirmation and removes the spot only after the API succeeds', () => {
    loggedInUser.set({ id: 11, name: 'João', email: 'owner@example.com' });
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('#util-card-1 .util-card__delete button')!.click();
    fixture.detectChanges();
    expect(deleteRequest).not.toHaveBeenCalled();
    element.querySelector<HTMLButtonElement>('#util-card-1 .util-card__delete button')!.click();
    fixture.detectChanges();
    expect(deleteRequest).not.toHaveBeenCalled();
    element.querySelector<HTMLButtonElement>('#util-card-1 .util-card__delete button')!.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('#util-card-1 .delete-confirm')!.click();
    fixture.detectChanges();
    expect(deleteRequest).toHaveBeenCalledWith('1');
    expect(cards()).toHaveLength(3);
    expect(element.querySelector<HTMLButtonElement>('.delete-confirm')!.disabled).toBe(true);
    deletion.next();
    deletion.complete();
    fixture.detectChanges();
    expect(cards()).toEqual(['Smoke Segura', 'Smoke Antiga']);
  });

  it('preserves the spot and shows the API error when deletion is denied', () => {
    loggedInUser.set({ id: 11, name: 'João', email: 'owner@example.com' });
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('#util-card-1 .util-card__delete button')!.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('#util-card-1 .delete-confirm')!.click();
    deletion.error({ status: 403, error: { error: 'Somente o autor pode apagar este spot.' } });
    fixture.detectChanges();
    expect(cards()).toHaveLength(3);
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Somente o autor');
    expect(element.querySelector<HTMLButtonElement>('.delete-confirm')!.disabled).toBe(false);
  });

});

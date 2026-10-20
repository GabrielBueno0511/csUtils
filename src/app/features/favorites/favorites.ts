import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { FavoritesService } from '../../shared/services/favorites.service';
import { UtilityDto } from '../../shared/services/utility.service';
import { THROW_TYPE_OPTIONS } from '../../shared/models/spot-form.interface';

@Component({
  selector: 'app-favorites',
  imports: [RouterLink],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class FavoritesComponent {
  protected readonly auth = inject(AuthService);
  private readonly favorites = inject(FavoritesService);
  protected readonly utilities = signal<UtilityDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly removingId = signal<number | null>(null);
  private readonly reload = signal(0);

  constructor() {
    effect(onCleanup => {
      const userId = this.auth.user()?.id;
      this.reload();
      this.utilities.set([]);
      this.error.set('');
      this.loading.set(!!userId);
      this.removingId.set(null);
      if (!userId) return;
      const subscription = this.favorites.list().subscribe({
        next: utilities => { this.utilities.set(utilities); this.loading.set(false); },
        error: () => { this.error.set('Não foi possível carregar seus favoritos. Tente novamente.'); this.loading.set(false); },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected retry(): void { this.reload.update(value => value + 1); }

  protected remove(utility: UtilityDto): void {
    if (!utility.id || this.removingId() !== null || !this.auth.user()) return;
    const userId = this.auth.user()!.id;
    this.removingId.set(utility.id);
    this.error.set('');
    this.favorites.setFavorite(utility.id, false).subscribe({
      next: () => {
        if (this.auth.user()?.id !== userId) return;
        this.utilities.update(items => items.filter(item => item.id !== utility.id));
        this.removingId.set(null);
      },
      error: error => {
        if (this.auth.user()?.id !== userId) return;
        this.removingId.set(null);
        this.error.set(error.error?.error ?? 'Não foi possível remover o favorito. Tente novamente.');
      },
    });
  }

  protected throwLabel(type: string): string {
    return THROW_TYPE_OPTIONS.find(option => option.value === type)?.label ?? type;
  }
}

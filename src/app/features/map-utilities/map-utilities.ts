import { Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { FavoritesService } from '../../shared/services/favorites.service';
import { AuthService } from '../../shared/services/auth.service';
import { THROW_TYPE_OPTIONS, UTILITY_TYPE_OPTIONS, UtilityType } from '../../shared/models/utility-form.interface';
import { SavedUtility } from '../../shared/models/saved-utility.interface';
import { UtilityService } from '../../shared/services/utility.service';

const MAP_NAMES: Record<string, string> = {
    dust2: 'Dust 2', mirage: 'Mirage', inferno: 'Inferno', nuke: 'Nuke',
    ancient: 'Ancient', anubis: 'Anubis', cache: 'Cache',
};

@Component({
    selector: 'app-map-utilities',
    standalone: true,
    imports: [RouterLink, FormsModule],
    templateUrl: './map-utilities.html',
    styleUrl: './map-utilities.scss'
})
export class MapUtilitiesComponent {
    protected readonly auth = inject(AuthService);
    protected readonly favorites = inject(FavoritesService);
    protected readonly favoriteError = signal('');
    private readonly route = inject(ActivatedRoute);
    private readonly utilityService = inject(UtilityService);

    protected readonly mapId = signal<string>('');
    protected readonly utilityType = signal<UtilityType>('smoke');
    protected readonly utilityTypeLabel = computed(() => UTILITY_TYPE_OPTIONS.find(option => option.value === this.utilityType())?.label ?? 'Utilitárias');
    protected readonly mapName = computed(() => MAP_NAMES[this.mapId()] ?? this.mapId());

    protected readonly savedUtilities = signal<SavedUtility[]>([]);
    protected readonly isLoadingUtils = signal<boolean>(true);

    protected readonly authorFilter = signal('');
    protected readonly nameFilter = signal('');
    protected readonly throwFilter = signal('');
    protected readonly hasFilters = computed(() =>
        this.authorFilter().trim() !== '' || this.nameFilter().trim() !== '' || this.throwFilter() !== '');
    protected readonly throwOptions = computed(() => {
        const options = new Map<string, string>(THROW_TYPE_OPTIONS.map(option => [option.value, option.label]));
        for (const utility of this.savedUtilities()) {
            if (!options.has(utility.throwType)) options.set(utility.throwType, this.formatThrowType(utility.throwType));
        }
        return [...options].map(([value, label]) => ({ value, label }));
    });
    protected readonly filteredUtilities = computed(() => {
        const author = this.normalize(this.authorFilter());
        const name = this.normalize(this.nameFilter());
        const throwType = this.throwFilter();
        return this.savedUtilities().filter(utility =>
            this.normalize(utility.authorName ?? '').includes(author) &&
            this.normalize(utility.pixelName).includes(name) &&
            (!throwType || utility.throwType === throwType));
    });

    protected readonly pendingDelete = signal<string | null>(null);
    protected readonly deletingId = signal<string | null>(null);
    protected readonly deleteError = signal('');

    protected toggleFavorite(utility: SavedUtility): void {
        const id = Number(utility.id);
        if (!this.auth.user() || this.favorites.loading() || this.favorites.isBusy(id)) return;
        this.favoriteError.set('');
        this.favorites.setFavorite(id, !this.favorites.isFavorite(id)).subscribe({
            error: error => this.favoriteError.set(error.error?.error ?? 'Não foi possível atualizar o favorito. Tente novamente.'),
        });
    }

    protected canDelete(utility: SavedUtility): boolean {
        const user = this.auth.user();
        return user !== null && utility.authorId === user.id;
    }

    protected requestDelete(utility: SavedUtility): void {
        if (!this.canDelete(utility) || this.deletingId() !== null) return;
        this.deleteError.set('');
        this.pendingDelete.set(utility.id);
    }

    protected deleteUtility(utility: SavedUtility): void {
        if (!this.canDelete(utility) || this.pendingDelete() !== utility.id || this.deletingId() !== null) return;
        this.deletingId.set(utility.id);
        this.deleteError.set('');
        this.utilityService.deleteUtility(utility.id).pipe(
            finalize(() => this.deletingId.set(null)),
        ).subscribe({
            next: () => {
                this.savedUtilities.update(items => items.filter(item => item.id !== utility.id));
                this.pendingDelete.set(null);
            },
            error: error => this.deleteError.set(error.error?.error ?? 'Não foi possível apagar o pixel. Tente novamente.'),
        });
    }

    protected clearFilters(): void {
        this.authorFilter.set('');
        this.nameFilter.set('');
        this.throwFilter.set('');
    }

    private normalize(value: string): string {
        return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    }

    constructor() {
        this.route.paramMap.subscribe((params) => {
            const mid = params.get('mapId');
            const type = params.get('utilityType') as UtilityType | null;
            if (mid && type && UTILITY_TYPE_OPTIONS.some(option => option.value === type)) {
                this.clearFilters();
                this.pendingDelete.set(null);
                this.deleteError.set('');
                this.mapId.set(mid);
                this.utilityType.set(type);
                this.loadUtilities(mid, type);
            }
        });
    }

    private loadUtilities(mapId: string, utilityType: UtilityType): void {
        this.isLoadingUtils.set(true);
        this.utilityService.getUtilitiesByMap(mapId).subscribe({
            next: (data) => {
                const filtered = data.filter(u => u.utility_type === utilityType).map(u => ({
                    id: u.id ? u.id.toString() : Math.random().toString(),
                    mapId: u.map_name,
                    utilityType: u.utility_type,
                    pixelName: u.pixel_name,
                    authorId: u.author_id ?? null,
                    authorName: u.author_name ?? null,
                    throwType: u.throw_type as any,
                    positionImageUrl: u.player_position_image,
                    crosshairImageUrl: u.aim_position_image
                }));
                this.savedUtilities.set(filtered);
                this.isLoadingUtils.set(false);
            },
            error: (e) => {
                console.error(e);
                this.savedUtilities.set([]);
                this.isLoadingUtils.set(false);
            }
        });
    }

    protected formatThrowType(type: string): string {
        switch (type) {
            case 'normal': return 'Normal (Clique Direito)';
            case 'jump-throw': return 'Jump Throw';
            case 'run-throw': return 'Run Throw';
            case 'crouch-throw': return 'Crouch Throw';
            case 'walk-throw': return 'Walk Throw';
            default: return type;
        }
    }
}

import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UTILITY_TYPE_OPTIONS } from '../../shared/models/utility-form.interface';

const MAP_NAMES: Record<string, string> = {
    dust2: 'Dust 2', mirage: 'Mirage', inferno: 'Inferno', nuke: 'Nuke',
    ancient: 'Ancient', anubis: 'Anubis', cache: 'Cache',
};

@Component({
    selector: 'app-map-utility-types',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './map-utility-types.html',
    styleUrl: './map-utility-types.scss',
})
export class MapUtilityTypesComponent {
    private readonly route = inject(ActivatedRoute);
    protected readonly mapId = signal('');
    protected readonly mapName = computed(() => MAP_NAMES[this.mapId()] ?? '');
    protected readonly utilityTypes = UTILITY_TYPE_OPTIONS;

    constructor() {
        this.route.paramMap.subscribe(params => this.mapId.set(params.get('id') ?? ''));
    }
}

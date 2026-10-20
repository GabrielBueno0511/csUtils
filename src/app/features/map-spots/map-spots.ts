import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SpotItem, MapSpotsData } from '../../shared/models/spot-item.interface';
import { MAP_SPOTS_DATA } from '../../shared/data/map-spots.data';

@Component({
    selector: 'app-map-spots',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './map-spots.html',
    styleUrl: './map-spots.scss',
})
export class MapSpotsComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    protected readonly mapId = signal<string>('');
    protected readonly mapData = computed<MapSpotsData | undefined>(() => {
        return MAP_SPOTS_DATA[this.mapId()];
    });

    constructor() {
        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            if (id) {
                this.mapId.set(id);
            }
        });
    }

    protected onSelectSpot(spot: SpotItem): void {
        this.router.navigate(['/map', this.mapId(), 'spot', spot.id]);
    }
}

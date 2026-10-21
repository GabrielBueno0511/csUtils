import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SpotCatalogService } from '../../shared/services/spot-catalog.service';

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
    private readonly catalog = inject(SpotCatalogService);

    protected readonly mapId = signal<string>('');
    protected readonly mapData = computed<MapSpotsData | undefined>(() => {
        return MAP_SPOTS_DATA[this.mapId()];
    });
    protected readonly spots = signal<SpotItem[]>([]);

    constructor() {
        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            if (id) {
                this.mapId.set(id);
                this.catalog.forMap(id).subscribe({
                    next: spots => this.spots.set(spots),
                    error: () => this.spots.set(MAP_SPOTS_DATA[id]?.spots ? [...MAP_SPOTS_DATA[id].spots] : []),
                });
            }
        });
    }

    protected onSelectSpot(spot: SpotItem): void {
        this.router.navigate(['/map', this.mapId(), 'spot', spot.id]);
    }
}

import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { FavoritesComponent } from '../favorites/favorites';
import { AuthService } from '../../shared/services/auth.service';
import { MapItem } from '../../shared/models/map-item.interface';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [RouterLink, FavoritesComponent],
    templateUrl: './home.html',
    styleUrl: './home.scss',
})
export class HomeComponent {
    protected readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    protected readonly selectedTab = signal<'maps' | 'favorites'>('maps');

    constructor() {
        this.route.queryParamMap.subscribe(params => {
            this.selectedTab.set(params.get('tab') === 'favorites' ? 'favorites' : 'maps');
        });
    }

    protected readonly maps = signal<MapItem[]>([
        { id: 'dust2', name: 'Dust 2', image: 'maps/dust2.png', route: '/map/dust2' },
        { id: 'mirage', name: 'Mirage', image: 'maps/mirage.png', route: '/map/mirage' },
        { id: 'inferno', name: 'Inferno', image: 'maps/inferno.png', route: '/map/inferno' },
        { id: 'nuke', name: 'Nuke', image: 'maps/nuke.png', route: '/map/nuke' },
        { id: 'ancient', name: 'Ancient', image: 'maps/ancient.png', route: '/map/ancient' },
        { id: 'anubis', name: 'Anubis', image: 'maps/anubis.png', route: '/map/anubis' },
        { id: 'cache', name: 'Cache', image: 'maps/cache.png', route: '/map/cache' },
    ]);
}

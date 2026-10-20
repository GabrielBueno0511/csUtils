import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
    { path: 'login', loadComponent: () => import('./features/auth/auth').then(m => m.AuthComponent) },
    { path: 'register', data: { registering: true }, loadComponent: () => import('./features/auth/auth').then(m => m.AuthComponent) },
    {
        path: '',
        loadComponent: () =>
            import('./features/home/home').then((m) => m.HomeComponent),
    },
    {
        path: 'map/:id',
        loadComponent: () =>
            import('./features/map-spots/map-spots').then((m) => m.MapSpotsComponent),
    },
    {
        path: 'create-spot',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/create-spot/create-spot').then((m) => m.CreateSpotComponent),
    },
    {
        path: 'map/:mapId/spot/:spotNameId',
        loadComponent: () =>
            import('./features/spot-utils/spot-utils').then((m) => m.SpotUtilsComponent),
    },
];

import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
    { path: 'login', loadComponent: () => import('./features/auth/auth').then(m => m.AuthComponent) },
    { path: 'register', data: { registering: true }, loadComponent: () => import('./features/auth/auth').then(m => m.AuthComponent) },
    { path: 'forgot-password', loadComponent: () => import('./features/auth/password-recovery').then(m => m.PasswordRecoveryComponent) },
    { path: 'reset-password', data: { settingNewPassword: true }, loadComponent: () => import('./features/auth/password-recovery').then(m => m.PasswordRecoveryComponent) },
    {
        path: 'admin/users',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin-users/admin-users').then(m => m.AdminUsersComponent),
    },
    {
        path: 'admin/spots',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin-spots/admin-spots').then(m => m.AdminSpotsComponent),
    },
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

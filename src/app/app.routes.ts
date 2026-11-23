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
        path: '',
        loadComponent: () =>
            import('./features/home/home').then((m) => m.HomeComponent),
    },
    {
        path: 'create-utility',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/create-utility/create-utility').then((m) => m.CreateUtilityComponent),
    },
    {
        path: 'map/:mapId/:utilityType',
        loadComponent: () =>
            import('./features/map-utilities/map-utilities').then((m) => m.MapUtilitiesComponent),
    },
    {
        path: 'map/:mapId',
        loadComponent: () =>
            import('./features/map-utilities/map-utilities').then((m) => m.MapUtilitiesComponent),
    },
];

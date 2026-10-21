import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.restore().pipe(
    map(response => response?.user ? true : router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    })),
    catchError(() => of(router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    }))),
  );
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.restore().pipe(
    map(response => {
      if (!response?.user) return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
      return auth.isAdmin() ? true : router.createUrlTree(['/']);
    }),
    catchError(() => of(router.createUrlTree(['/']))),
  );
};

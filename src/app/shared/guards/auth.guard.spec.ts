import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  function check(response: unknown): Observable<boolean | UrlTree> {
    TestBed.configureTestingModule({ providers: [provideRouter([]), {
      provide: AuthService, useValue: { restore: () => of(response) },
    }] });
    return TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot,
      { url: '/create-spot' } as RouterStateSnapshot)) as Observable<boolean | UrlTree>;
  }

  it('redirects anonymous users and preserves their destination', () => {
    check(null).subscribe(result => {
      expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fcreate-spot');
    });
  });

  it('allows a session validated by the API', () => {
    check({ user: { id: 1 } }).subscribe(result => expect(result).toBe(true));
  });
});

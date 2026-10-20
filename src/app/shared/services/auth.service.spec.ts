import { TimeoutError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

const user = { id: 1, name: 'Jogador', email: 'jogador@example.com' };

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('restores a session and clears it when the server returns 401', () => {
    auth.restore().subscribe();
    const request = http.expectOne('/api/auth/me');
    expect(request.request.transferCache).toBe(false);
    request.flush({ user });
    expect(auth.user()).toEqual(user);
    auth.restore().subscribe(response => expect(response).toBeNull());
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.user()).toBeNull();
  });

  it('keeps network failures distinguishable from a logged-out session', () => {
    let status = 0;
    auth.restore().subscribe({ error: error => status = error.status });
    http.expectOne('/api/auth/me').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(status).toBe(503);
  });

  it('sets the user on login and only clears after successful logout', () => {
    auth.login(user.email, 'senha-segura-123').subscribe();
    const login = http.expectOne('/api/auth/login');
    expect(login.request.body).toEqual({ email: user.email, password: 'senha-segura-123' });
    login.flush({ user });
    auth.logout().subscribe({ error: () => {} });
    http.expectOne('/api/auth/logout').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(auth.user()).toEqual(user);
    auth.logout().subscribe();
    http.expectOne('/api/auth/logout').flush({ message: 'Você saiu da conta.' });
    expect(auth.user()).toBeNull();
  });

  it('fails a stalled registration after 15 seconds without creating another request', () => {
    vi.useFakeTimers();
    try {
      let failure: unknown;
      auth.register(user.name, user.email, 'senha-segura-123').subscribe({
        error: error => failure = error,
      });
      const request = http.expectOne('/api/auth/register');
      vi.advanceTimersByTime(15000);
      expect(failure).toBeInstanceOf(TimeoutError);
      expect(request.cancelled).toBe(true);
      expect(auth.user()).toBeNull();
      http.expectNone('/api/auth/register');
    } finally {
      vi.useRealTimers();
    }
  });

});

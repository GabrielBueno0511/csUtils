import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, defer, of, tap, throwError, timeout } from 'rxjs';

import { SupabaseService } from './supabase.service';

export interface AuthUser { id: number | string; name: string; email: string; }
export interface AuthResponse { user: AuthUser | null; confirmationRequired?: boolean; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly currentUser = signal<AuthUser | null>(null);
  readonly user = this.currentUser.asReadonly();

  constructor() {
    if (this.supabase.enabled) this.supabase.watchAuth(user => this.currentUser.set(user));
  }

  restore(): Observable<AuthResponse | null> {
    if (this.supabase.enabled) return defer(() => this.supabase.restore()).pipe(tap(response => this.currentUser.set(response?.user ?? null)));
    if (!isPlatformBrowser(this.platformId)) return of(null);
    return this.http.get<AuthResponse>('/api/auth/me', { transferCache: false }).pipe(
      timeout(15000),
      tap(response => this.currentUser.set(response.user)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.currentUser.set(null);
          return of(null);
        }
        return throwError(() => error);
      }),
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    if (this.supabase.enabled) return defer(() => this.supabase.login(email, password)).pipe(tap(response => this.currentUser.set(response.user)));
    return this.authenticate('login', { email, password });
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    if (this.supabase.enabled) return defer(() => this.supabase.register(name, email, password)).pipe(tap(response => this.currentUser.set(response.user)));
    return this.authenticate('register', { name, email, password });
  }

  logout(): Observable<unknown> {
    if (this.supabase.enabled) return defer(() => this.supabase.logout()).pipe(tap(() => this.clear()));
    return this.http.post('/api/auth/logout', {}).pipe(timeout(15000), tap(() => this.clear()));
  }

  clear(): void { this.currentUser.set(null); }

  private authenticate(action: string, body: object): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`/api/auth/${action}`, body).pipe(
      timeout(15000),
      tap(response => this.currentUser.set(response.user)),
    );
  }
}

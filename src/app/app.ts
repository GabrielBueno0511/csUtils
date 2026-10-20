import { Component, afterNextRender, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './shared/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly logoutBusy = signal(false);
  protected readonly authError = signal('');

  constructor() {
    afterNextRender(() => this.auth.restore().subscribe({
      error: () => this.authError.set('Não foi possível verificar sua sessão. Confira a conexão com a API.'),
    }));
  }

  protected logout(): void {
    if (this.logoutBusy()) return;
    this.logoutBusy.set(true);
    this.authError.set('');
    this.auth.logout().subscribe({
      next: () => { this.logoutBusy.set(false); void this.router.navigate(['/']); },
      error: () => {
        this.logoutBusy.set(false);
        this.authError.set('Não foi possível sair. Tente novamente.');
      },
    });
  }
}

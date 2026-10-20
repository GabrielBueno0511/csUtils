import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TimeoutError, finalize } from 'rxjs';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-auth',
  imports: [FormsModule, RouterLink],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class AuthComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly registering = this.route.snapshot.data['registering'] === true;
  protected readonly returnUrl = (() => {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url?.startsWith('/') && !url.startsWith('//') && !url.includes('\\') &&
      !/^\/(login|register)([/?#]|$)/.test(url) ? url : '/';
  })();
  protected name = '';
  protected email = '';
  protected password = '';
  protected confirmPassword = '';
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  protected submit(): void {
    if (this.busy()) return;
    this.error.set('');
    this.notice.set('');
    if (this.registering && this.password !== this.confirmPassword) {
      this.error.set('As senhas precisam ser iguais.');
      return;
    }
    this.busy.set(true);
    const action = this.registering
      ? this.auth.register(this.name, this.email, this.password)
      : this.auth.login(this.email, this.password);
    action.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: response => {
        if (response.confirmationRequired) {
          this.notice.set('Confira seu e-mail e confirme o cadastro antes de entrar.');
          this.password = '';
          this.confirmPassword = '';
          return;
        }
        void this.router.navigateByUrl(this.returnUrl);
      },
      error: error => {
        if (error instanceof TimeoutError) {
          this.error.set('O servidor demorou para responder. Tente novamente em instantes. Se o cadastro tiver sido concluído, tente entrar.');
          return;
        }
        this.error.set(error.error?.error ?? 'Não foi possível conectar à API. Tente novamente.');
      },
    });
  }
}

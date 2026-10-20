import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TimeoutError, finalize } from 'rxjs';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-password-recovery',
  imports: [FormsModule, RouterLink],
  templateUrl: './password-recovery.html',
  styleUrl: './auth.scss',
})
export class PasswordRecoveryComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly settingNewPassword = this.route.snapshot.data['settingNewPassword'] === true;
  protected readonly busy = signal(false);
  protected readonly requestSent = signal(false);
  protected readonly passwordChanged = signal(false);
  protected readonly error = signal('');
  protected email = '';
  protected password = '';
  protected confirmPassword = '';

  protected submit(): void {
    if (this.busy()) return;
    this.error.set('');
    if (this.settingNewPassword && this.password !== this.confirmPassword) {
      this.error.set('As senhas precisam ser iguais.');
      return;
    }
    this.busy.set(true);
    const request = this.settingNewPassword
      ? this.auth.updatePassword(this.password)
      : this.auth.sendPasswordReset(this.email);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        if (this.settingNewPassword) {
          this.password = '';
          this.confirmPassword = '';
          this.passwordChanged.set(true);
        } else {
          this.requestSent.set(true);
        }
      },
      error: error => this.error.set(this.messageFor(error)),
    });
  }

  protected goToLogin(): void {
    void this.router.navigateByUrl('/login');
  }

  private messageFor(error: any): string {
    if (error instanceof TimeoutError) return 'A solicitação demorou para responder. Tente novamente em instantes.';
    const status = error?.status;
    const message = String(error?.error?.error ?? error?.message ?? '').toLowerCase();
    if (status === 0 || error instanceof TypeError) return 'Não foi possível conectar ao serviço. Verifique sua internet e tente novamente.';
    if (/rate limit|too many requests|over_email_send_rate_limit/.test(message) || status === 429) {
      return 'O limite de e-mails do Supabase foi atingido: o serviço padrão envia até 2 por hora. Aguarde até uma hora ou configure um SMTP próprio no Supabase.';
    }
    if (this.settingNewPassword && (status === 400 || /expired|invalid.*(token|link)|flow_state/.test(message))) {
      return 'Este link expirou ou já foi usado. Peça uma nova redefinição de senha.';
    }
    if (/weak_password|senha.*(forte|caracteres)/.test(message)) return 'Use uma senha mais forte, com pelo menos 10 caracteres.';
    if (status >= 500) return 'O serviço está temporariamente indisponível. Tente novamente em instantes.';
    return this.settingNewPassword
      ? 'Não foi possível atualizar a senha. Peça um novo link e tente novamente.'
      : 'Não foi possível enviar o e-mail de redefinição. Confira o endereço e tente novamente.';
  }
}

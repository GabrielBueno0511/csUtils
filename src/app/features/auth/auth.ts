import { Component, effect, inject, signal } from '@angular/core';
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
  private readonly redirectAfterConfirmation = effect(() => {
    if (!this.registering && this.auth.user()) void this.router.navigateByUrl(this.returnUrl);
  });
  protected name = '';
  protected email = '';
  protected password = '';
  protected confirmPassword = '';
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly confirmationPending = signal(false);
  protected readonly confirmationEmail = signal('');
  protected readonly canResendConfirmation = signal(false);
  protected readonly resendBusy = signal(false);
  protected readonly resendNotice = signal('');

  protected submit(): void {
    if (this.busy()) return;
    this.error.set('');
    this.canResendConfirmation.set(false);
    this.resendNotice.set('');
    this.confirmationPending.set(false);
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
          this.confirmationEmail.set(this.email.trim());
          this.confirmationPending.set(true);
          this.password = '';
          this.confirmPassword = '';
          return;
        }
        void this.router.navigateByUrl(this.returnUrl);
      },
      error: error => {
        const message = String(error?.error?.error ?? '').toLowerCase();
        this.canResendConfirmation.set(!this.registering && /email_not_confirmed|confirme seu e-mail/.test(message));
        this.error.set(this.authError(error));
      },
    });
  }

  protected resendConfirmation(): void {
    if (this.resendBusy()) return;
    const email = (this.confirmationPending() ? this.confirmationEmail() : this.email).trim();
    if (!email) return;
    this.resendBusy.set(true);
    this.resendNotice.set('');
    this.auth.resendConfirmation(email).pipe(finalize(() => this.resendBusy.set(false))).subscribe({
      next: () => {
        this.canResendConfirmation.set(false);
        this.resendNotice.set(`Se ${email} precisar confirmar a conta, enviaremos um novo link.`);
      },
      error: () => this.resendNotice.set('Não foi possível reenviar agora. Aguarde um pouco e tente novamente.'),
    });
  }

  private authError(error: any): string {
    if (error instanceof TimeoutError) return this.registering
      ? 'O cadastro demorou para responder. Tente entrar antes de cadastrar de novo, pois a conta pode ter sido criada.'
      : 'O servidor demorou para responder. Tente novamente em instantes.';
    const status = error?.status;
    const message = String(error?.error?.error ?? error?.error?.message ?? error?.message ?? '').toLowerCase();
    if (status === 0 || error instanceof TypeError) return this.registering
      ? 'Não foi possível conectar ao serviço de cadastro. Verifique sua internet e tente novamente.'
      : 'Não foi possível conectar ao serviço. Verifique sua internet e tente novamente.';
    if (!this.registering) return error?.error?.error ?? 'Não foi possível entrar. Confira seu e-mail e sua senha.';
    if (status === 409 || /already.?registered|user_already_exists|email_exists|já existe|already been registered/.test(message)) {
      return 'Já existe uma conta com este e-mail. Entre ou use a opção de recuperar senha.';
    }
    if (/invalid email|email_address_invalid|e-mail inválido/.test(message)) return 'Confira se o endereço de e-mail foi digitado corretamente.';
    if (/weak_password|password should|password.*(characters|length)|senha.*(forte|caracteres)/.test(message)) {
      return 'Sua senha não atende aos requisitos. Use de 10 a 128 caracteres e tente novamente.';
    }
    if (/signup_disabled|signups.*disabled/.test(message)) return 'O cadastro está temporariamente indisponível. Tente novamente mais tarde.';
    if (/over_email_send_rate_limit|rate limit|too many requests/.test(message) || status === 429) {
      return 'Foram enviados muitos pedidos em pouco tempo. Aguarde alguns minutos antes de tentar novamente.';
    }
    if (status === 400) return 'Não foi possível criar a conta com esses dados. Confira o nome, o e-mail e a senha.';
    if (status >= 500) return 'O serviço de cadastro está temporariamente indisponível. Tente novamente em instantes.';
    return 'Não foi possível criar sua conta agora. Confira os dados e tente novamente.';
  }
}

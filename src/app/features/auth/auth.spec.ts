import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthComponent } from './auth';
import { AuthService } from '../../shared/services/auth.service';

describe('Cadastro com confirmação de e-mail', () => {
  it('shows the email confirmation message without navigating to an authenticated page', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: AuthService, useValue: { register: () => of({ user: null, confirmationRequired: true }) } },
      { provide: ActivatedRoute, useValue: { snapshot: { data: { registering: true }, queryParamMap: new Map() } } },
    ] });
    const fixture = TestBed.createComponent(AuthComponent);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl');
    const component = fixture.componentInstance as any;
    component.password = 'secure-password';
    component.confirmPassword = 'secure-password';
    component.submit();
    fixture.detectChanges();
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('confirme o cadastro');
    expect(component.password).toBe('');
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { submit } from '@angular/forms/signals';
import { of, throwError } from 'rxjs';
import { FooterService } from '../../services/footer.service';
import { NavbarService } from '../../services/navbar.service';
import { SessionStorageService } from '../../services/session-storage.service';
import { UserLoginService } from '../../services/user-login.service';
import { UserLoginComponent } from './user-login.component';

describe('UserLoginComponent', () => {
  let login: ReturnType<typeof vi.fn>;
  let checkCredentials: ReturnType<typeof vi.fn>;
  let component: UserLoginComponent;

  beforeEach(() => {
    login = vi.fn().mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    checkCredentials = vi
      .fn()
      .mockReturnValue({ success: true, message: 'ok' });

    TestBed.configureTestingModule({
      providers: [
        { provide: UserLoginService, useValue: { login, checkCredentials } },
        {
          provide: NavbarService,
          useValue: { hideNavbar: vi.fn(), displayNavbar: vi.fn() },
        },
        {
          provide: FooterService,
          useValue: { hideFooter: vi.fn(), displayFooter: vi.fn() },
        },
        {
          provide: SessionStorageService,
          useValue: { removeSessionStorage: vi.fn() },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new UserLoginComponent());
  });

  it('does not call the API when required fields are empty, and flags both', async () => {
    await submit(component.loginForm);

    expect(login).not.toHaveBeenCalled();
    expect(component.loginForm.username().errors()[0].message).toBe(
      'Username is required.',
    );
    expect(component.loginForm.password().errors()[0].message).toBe(
      'Password is required.',
    );
  });

  it('rejects a username with disallowed characters', () => {
    component.model.set({ username: 'bad;name', password: 'x' });

    expect(component.loginForm.username().errors()[0].message).toBe(
      'Invalid username format.',
    );
  });

  it('sends the username and password and clears any error on success', async () => {
    component.model.set({
      username: 'TestMerchantID',
      password: 'Merchant123',
    });

    await submit(component.loginForm);

    expect(login).toHaveBeenCalledWith({
      username: 'TestMerchantID',
      password: 'Merchant123',
    });
    expect(component.loginError()).toBeNull();
  });

  it('shows the API message when the credentials check fails', async () => {
    checkCredentials.mockReturnValue({ success: false, message: 'Nope' });
    component.model.set({ username: 'TestMerchantID', password: 'x' });

    await submit(component.loginForm);

    expect(component.loginError()).toBe('Nope');
  });

  it('shows the API problem detail when sign-in is rejected', async () => {
    login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: {
              title: 'Unauthorized',
              status: 401,
              detail: 'Invalid username or password.',
            },
          }),
      ),
    );
    component.model.set({ username: 'TestMerchantID', password: 'x' });

    await submit(component.loginForm);

    expect(component.loginError()).toBe('Invalid username or password.');
  });

  it.each([
    [
      0,
      'Could not reach the server. It may be offline, or your browser may not trust its security certificate.',
    ],
    [502, 'Sign-in failed (502). Please try again.'],
  ])(
    'explains HTTP %i when there is no problem body',
    async (status, message) => {
      login.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status })),
      );
      component.model.set({ username: 'TestMerchantID', password: 'x' });

      await submit(component.loginForm);

      expect(component.loginError()).toBe(message);
    },
  );

  describe('session-expired notice', () => {
    const render = (sessionExpired?: string) => {
      const fixture = TestBed.createComponent(UserLoginComponent);
      if (sessionExpired)
        fixture.componentRef.setInput('sessionExpired', sessionExpired);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };

    it('explains why the user landed here after a session expiry', () => {
      const alert = render('true').querySelector('[role="status"]');

      expect(alert?.textContent).toContain('Your session has expired');
    });

    it('shows nothing extra on a normal visit', () => {
      expect(render().querySelector('.alert-warning')).toBeNull();
    });
  });
});

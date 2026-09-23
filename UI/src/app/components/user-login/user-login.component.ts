import { Component, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormField,
  FormRoot,
  form,
  pattern,
  required,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserLoginRequest } from '../../interfaces/user-login-request';
import { FooterService } from '../../services/footer.service';
import { NavbarService } from '../../services/navbar.service';
import { SessionStorageService } from '../../services/session-storage.service';
import { UserLoginService } from '../../services/user-login.service';

interface LoginModel {
  username: string;
  password: string;
}

@Component({
  selector: 'app-user-login',
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.css'],
  imports: [FormField, FormRoot],
})
export class UserLoginComponent implements OnInit, OnDestroy {
  private readonly userLoginService = inject(UserLoginService);
  private readonly navbarService = inject(NavbarService);
  private readonly footerService = inject(FooterService);
  private readonly sessionStorageService = inject(SessionStorageService);

  // `?sessionExpired=true` is added by AuthGuardService / authErrorInterceptor
  // when a token is missing or rejected; bound here by withComponentInputBinding().
  readonly sessionExpired = input<string>();

  readonly model = signal<LoginModel>({ username: '', password: '' });
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm = form(
    this.model,
    (p) => {
      required(p.username, { message: 'Username is required.' });
      pattern(p.username, new RegExp(environment.UserName), {
        message: 'Invalid username format.',
      });
      required(p.password, { message: 'Password is required.' });
    },
    {
      submission: {
        action: () => this.login(),
        // Land on the first field that needs fixing.
        onInvalid: (field) =>
          field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

  ngOnInit(): void {
    // Clear session storage and prepare UI
    this.sessionStorageService.removeSessionStorage();
    this.navbarService.hideNavbar();
    this.footerService.hideFooter();
    this.errorMessage.set(null);
  }

  private async login(): Promise<void> {
    const { username, password } = this.model();
    const loginRequest: UserLoginRequest = {
      merchantId: username,
      merchantPassword: password,
    };

    try {
      const response = await firstValueFrom(
        this.userLoginService.login(loginRequest),
      );
      const result = this.userLoginService.checkCredentials(response);
      this.errorMessage.set(result.success ? null : result.message);
    } catch (error) {
      this.handleLoginError((error as HttpErrorResponse).status);
    }
  }

  private handleLoginError(statusCode: number): void {
    switch (statusCode) {
      case 403:
        this.errorMessage.set('Merchant credentials are incorrect!');
        break;
      case 404:
        this.errorMessage.set('Endpoint is down!');
        break;
      case 429:
        this.errorMessage.set(
          'Too many login attempts. Please wait a moment and try again.',
        );
        break;
      case 0:
        this.errorMessage.set(
          'Could not reach the server. It may be offline, or your browser does not trust its security certificate.',
        );
        break;
      default:
        this.errorMessage.set(`Server error (${statusCode}). Please try again later.`);
    }
  }

  ngOnDestroy(): void {
    this.navbarService.displayNavbar();
    this.footerService.displayFooter();
    this.errorMessage.set(null);
  }
}

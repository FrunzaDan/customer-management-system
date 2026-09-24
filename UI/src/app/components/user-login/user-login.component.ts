import {
  Component,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
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
import { extractErrorMessage } from '../../utils/extract-error-message';
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
  styleUrl: './user-login.component.css',
  imports: [FormField, FormRoot],
})
export class UserLoginComponent implements OnInit, OnDestroy {
  private readonly userLoginService = inject(UserLoginService);
  private readonly navbarService = inject(NavbarService);
  private readonly footerService = inject(FooterService);
  private readonly sessionStorageService = inject(SessionStorageService);

  readonly sessionExpired = input<string>();

  readonly model = signal<LoginModel>({ username: '', password: '' });
  readonly loginError = signal<string | null>(null);

  readonly loginForm = form(
    this.model,
    (p) => {
      required(p.username, { message: 'Username is required.' });
      pattern(p.username, new RegExp(environment.usernameRegex), {
        message: 'Invalid username format.',
      });
      required(p.password, { message: 'Password is required.' });
    },
    {
      submission: {
        action: () => this.login(),
        onInvalid: (field) =>
          field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

  ngOnInit(): void {
    this.sessionStorageService.removeSessionStorage();
    this.navbarService.hideNavbar();
    this.footerService.hideFooter();
    this.loginError.set(null);
  }

  private async login(): Promise<void> {
    const { username, password } = this.model();
    const loginRequest: UserLoginRequest = {
      username,
      password,
    };

    try {
      const response = await firstValueFrom(
        this.userLoginService.login(loginRequest),
      );
      const result = this.userLoginService.checkCredentials(response);
      this.loginError.set(result.success ? null : result.message);
    } catch (error) {
      this.loginError.set(
        extractErrorMessage(error as HttpErrorResponse, 'Sign-in failed'),
      );
    }
  }

  ngOnDestroy(): void {
    this.navbarService.displayNavbar();
    this.footerService.displayFooter();
    this.loginError.set(null);
  }
}

import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { UserLoginService } from '../../services/user-login.service';
import { NavbarService } from '../../services/navbar.service';
import { FooterService } from '../../services/footer.service';
import { UserLoginRequest } from '../../interfaces/user-login-request';
import { environment } from '../../../environments/environment';
import { SessionStorageService } from '../../services/session-storage.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-user-login',
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.css'],
  imports: [NgClass, ReactiveFormsModule],
})
export class UserLoginComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly userLoginService = inject(UserLoginService);
  private readonly navbarService = inject(NavbarService);
  private readonly footerService = inject(FooterService);
  private readonly sessionStorageService = inject(SessionStorageService);

  loginForm: FormGroup<{
    username: FormControl<string>;
    password: FormControl<string>;
  }> = this.formBuilder.nonNullable.group({
    username: [
      '',
      [Validators.required, Validators.pattern(environment.UserName)],
    ],
    password: ['', Validators.required],
  });
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    // Clear session storage and prepare UI
    this.sessionStorageService.removeSessionStorage();
    this.navbarService.hideNavbar();
    this.footerService.hideFooter();
    this.errorMessage.set(null);
  }

  get usernameControl() {
    return this.loginForm.get('username');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const loginRequest: UserLoginRequest = {
        merchantID: this.usernameControl?.value ?? '',
        merchantPassword: this.passwordControl?.value ?? '',
      };

      this.userLoginService.login(loginRequest).subscribe({
        next: (response) => {
          const result = this.userLoginService.checkCredentials(response);
          this.errorMessage.set(result.success ? null : result.message);
        },
        error: (error) => {
          this.handleLoginError(error.status);
        },
      });
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

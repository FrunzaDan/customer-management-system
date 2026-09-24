import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { VerifyTokenService } from './verify-token.service';
import { SessionStorageService } from './session-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuardService {
  private readonly verifyTokenService = inject(VerifyTokenService);
  private readonly router = inject(Router);
  private readonly sessionStorageService = inject(SessionStorageService);

  canActivate(): Observable<boolean> {
    return this.verifyTokenService.isTokenValid().pipe(
      map((isTokenValid: boolean) => {
        return isTokenValid ? true : this.redirectToLogin();
      }),
      // The failed verification call is already logged by apiLoggerInterceptor.
      catchError(() => this.handleError()),
    );
  }

  private redirectToLogin(): boolean {
    this.logout();
    this.router.navigate(['login'], { queryParams: { sessionExpired: true } });
    return false;
  }

  private logout(): void {
    this.sessionStorageService.removeSessionStorage();
  }

  private handleError(): Observable<boolean> {
    this.redirectToLogin();
    return of(false);
  }
}

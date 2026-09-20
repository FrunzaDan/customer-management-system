import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { VerifyTokenService } from '../../../src/app/services/verify-token.service';
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
      catchError((error) => this.handleError(error)),
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

  private handleError(error: unknown): Observable<boolean> {
    console.error('Error verifying token:', error);
    this.redirectToLogin();
    return of(false);
  }
}

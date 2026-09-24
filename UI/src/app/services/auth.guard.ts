import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { SessionStorageService } from './session-storage.service';
import { VerifyTokenService } from './verify-token.service';

// Lets a route through only with a token the API still accepts. Otherwise it
// clears the session and sends the user to the login page with
// `?sessionExpired=true`.
export const authGuard: CanActivateFn = (): Observable<boolean> => {
  const verifyTokenService = inject(VerifyTokenService);
  const router = inject(Router);
  const sessionStorageService = inject(SessionStorageService);

  const redirectToLogin = (): false => {
    sessionStorageService.removeSessionStorage();
    router.navigate(['login'], { queryParams: { sessionExpired: true } });
    return false;
  };

  return verifyTokenService.isTokenValid().pipe(
    map((isTokenValid) => isTokenValid || redirectToLogin()),
    // The failed verification call is already logged by apiLoggerInterceptor.
    catchError(() => of(redirectToLogin())),
  );
};

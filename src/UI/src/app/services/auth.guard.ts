import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { SessionStorageService } from './session-storage.service';
import { VerifyTokenService } from './verify-token.service';

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
    catchError(() => of(redirectToLogin())),
  );
};

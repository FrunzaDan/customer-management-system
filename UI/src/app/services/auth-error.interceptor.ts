import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionStorageService } from './session-storage.service';

// Skipped for Authentication endpoints: login (401 there just means bad
// credentials, not an expired session) and verify-token (whose own service
// and the auth guard already handle a 401 without a redirect side effect).
const AUTH_ENDPOINT_SEGMENT = '/api/Authentication/';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const sessionStorageService = inject(SessionStorageService);

  if (req.url.includes(AUTH_ENDPOINT_SEGMENT)) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        sessionStorageService.removeSessionStorage();
        router.navigate(['login'], { queryParams: { sessionExpired: true } });
      }
      return throwError(() => error);
    }),
  );
};

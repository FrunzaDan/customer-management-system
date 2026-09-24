import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { SessionStorageService } from './session-storage.service';

// Adds the signed-in user's bearer token to every request for this app's own API, and
// only to those, so the token never reaches another origin. With no token (before
// login, or during SSR, where there is no sessionStorage) the request goes out as is.
// Content-Type is left to HttpClient, which sets it from the body.
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${environment.apiUrl}/`)) {
    return next(req);
  }

  const token = inject(SessionStorageService).getSessionAccessToken();
  return next(
    token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req,
  );
};

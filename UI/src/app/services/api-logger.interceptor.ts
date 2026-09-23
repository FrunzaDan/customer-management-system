import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, tap, throwError } from 'rxjs';
import { ApiLoggerService } from './api-logger.service';

// Showcase app: every API call is mirrored to the browser console so anyone
// looking at devtools can see exactly what's being sent/received. Not
// something you'd want in a real production app.
const SENSITIVE_FIELDS = ['password'];

function redact(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const field of SENSITIVE_FIELDS) {
    if (field in clone) clone[field] = '••••••••';
  }
  return clone;
}

// Response bodies carry the live bearer JWT on a successful login (data.accessToken) —
// just as sensitive as the password redacted above, and logging defaults to on.
function redactResponse(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const clone: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  const data = clone['data'];
  if (data && typeof data === 'object' && 'accessToken' in data) {
    clone['data'] = { ...(data as Record<string, unknown>), accessToken: '••••••••' };
  }
  return clone;
}

export const apiLoggerInterceptor: HttpInterceptorFn = (req, next) => {
  if (
    !isPlatformBrowser(inject(PLATFORM_ID)) ||
    !inject(ApiLoggerService).enabled()
  ) {
    return next(req);
  }

  const startedAt = performance.now();
  console.log(`%c→ ${req.method} ${req.urlWithParams}`, 'color:#0a84ff;font-weight:bold', {
    body: redact(req.body),
  });

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const durationMs = Math.round(performance.now() - startedAt);
        console.log(
          `%c← ${req.method} ${req.urlWithParams} ${event.status} (${durationMs}ms)`,
          'color:#30d158;font-weight:bold',
          { body: redactResponse(event.body) },
        );
      }
    }),
    catchError((error: unknown) => {
      const durationMs = Math.round(performance.now() - startedAt);
      if (error instanceof HttpErrorResponse) {
        console.log(
          `%c✖ ${req.method} ${req.urlWithParams} ${error.status} (${durationMs}ms)`,
          'color:#ff453a;font-weight:bold',
          { error: error.error },
        );
      }
      return throwError(() => error);
    }),
  );
};

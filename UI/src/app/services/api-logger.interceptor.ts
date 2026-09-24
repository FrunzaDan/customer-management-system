import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { tap } from 'rxjs';
import { ApiLoggerService } from './api-logger.service';

const REDACTED = '••••••••';
const SENSITIVE_FIELDS = ['password', 'accessToken'];

function redactFields(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const fields = value as Record<string, unknown>;
  if (!SENSITIVE_FIELDS.some((field) => field in fields)) {
    return value;
  }
  const clone = { ...fields };
  for (const field of SENSITIVE_FIELDS) {
    if (field in clone) clone[field] = REDACTED;
  }
  return clone;
}

function redactResponse(body: unknown): unknown {
  if (!body || typeof body !== 'object' || !('data' in body)) {
    return redactFields(body);
  }
  const data = redactFields(body.data);
  return data === body.data ? body : { ...body, data };
}

export const apiLoggerInterceptor: HttpInterceptorFn = (req, next) => {
  if (
    !isPlatformBrowser(inject(PLATFORM_ID)) ||
    !inject(ApiLoggerService).enabled()
  ) {
    return next(req);
  }

  const startedAt = performance.now();
  const elapsedMs = () => Math.round(performance.now() - startedAt);
  console.log(
    `%c→ ${req.method} ${req.urlWithParams}`,
    'color:#0a84ff;font-weight:bold',
    { body: redactFields(req.body) },
  );

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          console.log(
            `%c← ${req.method} ${req.urlWithParams} ${event.status} (${elapsedMs()}ms)`,
            'color:#30d158;font-weight:bold',
            { body: redactResponse(event.body) },
          );
        }
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          console.log(
            `%c✖ ${req.method} ${req.urlWithParams} ${error.status} (${elapsedMs()}ms)`,
            'color:#ff453a;font-weight:bold',
            { error: error.error },
          );
        }
      },
    }),
  );
};

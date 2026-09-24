import { HttpErrorResponse } from '@angular/common/http';

// Every API error body is RFC 9457 Problem Details (application/problem+json,
// see ai_docs/api.md "Error handling"): "detail" is the message for this
// occurrence, "title" the generic one for the status. A validation failure is
// the ValidationProblemDetails variant, with per-field messages under "errors".
interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

// Shared by every component/service that turns a failed HttpClient call into a
// user-facing message: the validation messages, else the problem's detail (or
// title), else a generic line naming what failed. status === 0 means no
// response reached the browser at all (the API isn't running, or — over
// HTTPS — the browser doesn't trust its development certificate).
export function extractErrorMessage(
  error: HttpErrorResponse,
  fallbackAction = 'Request failed',
): string {
  if (error.status === 0) {
    return 'Could not reach the server. It may be offline, or your browser may not trust its security certificate.';
  }

  const problem = error.error as ProblemDetails | null;

  if (problem?.errors) {
    return Object.values(problem.errors).flat().join(' ');
  }

  return (
    problem?.detail ??
    problem?.title ??
    `${fallbackAction} (${error.status}). Please try again.`
  );
}

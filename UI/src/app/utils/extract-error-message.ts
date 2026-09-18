import { HttpErrorResponse } from '@angular/common/http';

// Shared by every component/service that turns a failed HttpClient call into a
// user-facing message. status === 0 means no response reached the browser at
// all (offline, or an untrusted TLS cert) — see ai_docs/angular-frontend.md.
export function extractErrorMessage(
  error: HttpErrorResponse,
  fallbackAction = 'Request failed',
): string {
  if (error.status === 0) {
    return 'Could not reach the server. It may be offline, or your browser does not trust its security certificate.';
  }
  return (
    error.error?.responseMessage ??
    error.error?.message ??
    `${fallbackAction} (${error.status}). Please try again.`
  );
}

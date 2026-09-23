import { HttpErrorResponse } from '@angular/common/http';

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

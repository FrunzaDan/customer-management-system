import { HttpErrorResponse } from '@angular/common/http';

interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

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

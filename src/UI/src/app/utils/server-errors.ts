import { HttpErrorResponse } from '@angular/common/http';
import { FieldTree, ValidationError } from '@angular/forms/signals';
import { extractErrorMessage } from './extract-error-message';

export interface ServerErrors {
  /** The API's errors that name a field of the form, to return from the submit action. */
  readonly fieldErrors: ValidationError.WithFieldTree[];
  /** What to show above the form: the errors no field could take, or null when none are left. */
  readonly message: string | null;
}

/**
 * Splits a failed save into errors for the form's fields and a message for the
 * rest. A validation problem's `errors` are keyed by request property, such as
 * `email` or `address.city`; each key is matched to the form field of that name,
 * ignoring case, or to the field named after its last segment when the form is
 * flatter than the request.
 */
export function toServerErrors(
  error: HttpErrorResponse,
  form: FieldTree<unknown>,
  fallbackAction: string,
): ServerErrors {
  const problemErrors = (
    error.error as { errors?: Record<string, string[]> } | null
  )?.errors;
  if (error.status === 0 || !problemErrors) {
    return {
      fieldErrors: [],
      message: extractErrorMessage(error, fallbackAction),
    };
  }

  const fieldErrors: ValidationError.WithFieldTree[] = [];
  const unmatched: string[] = [];
  for (const [key, messages] of Object.entries(problemErrors)) {
    const field = findField(form, key);
    for (const message of messages) {
      if (field)
        fieldErrors.push({ kind: 'server', message, fieldTree: field });
      else unmatched.push(message);
    }
  }

  return {
    fieldErrors,
    message: unmatched.length > 0 ? unmatched.join(' ') : null,
  };
}

function findField(
  form: FieldTree<unknown>,
  key: string,
): FieldTree<unknown> | undefined {
  const segments = key
    .replace(/^\$\.?/, '')
    .split(/[.[\]]+/)
    .filter(Boolean);
  if (segments.length === 0) return undefined;

  const byPath = segments.reduce<FieldTree<unknown> | undefined>(
    (field, segment) => field && childField(field, segment),
    form,
  );
  return byPath ?? childField(form, segments[segments.length - 1]);
}

function childField(
  field: FieldTree<unknown>,
  segment: string,
): FieldTree<unknown> | undefined {
  const value = field().value();
  if (value === null || typeof value !== 'object') return undefined;

  const name = Array.isArray(value)
    ? segment
    : Object.keys(value).find(
        (key) => key.toLowerCase() === segment.toLowerCase(),
      );
  if (name === undefined || !(name in value)) return undefined;
  return (field as unknown as Record<string, FieldTree<unknown>>)[name];
}

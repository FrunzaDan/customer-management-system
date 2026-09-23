import { HttpErrorResponse } from '@angular/common/http';
import { extractErrorMessage } from './extract-error-message';

describe('extractErrorMessage', () => {
  it('reports an unreachable server for status 0', () => {
    const error = new HttpErrorResponse({ status: 0 });

    expect(extractErrorMessage(error)).toBe(
      'Could not reach the server. It may be offline, or your browser does not trust its security certificate.',
    );
  });

  it("uses the envelope's responseMessage", () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { status: 409, responseMessage: 'Email already registered.' },
    });

    expect(extractErrorMessage(error)).toBe('Email already registered.');
  });

  it('falls back to a plain message when there is no responseMessage', () => {
    const error = new HttpErrorResponse({
      status: 500,
      error: { message: 'Something broke.' },
    });

    expect(extractErrorMessage(error)).toBe('Something broke.');
  });

  it('names the failed action when the response has no message body', () => {
    const error = new HttpErrorResponse({ status: 502 });

    expect(extractErrorMessage(error)).toBe(
      'Request failed (502). Please try again.',
    );
    expect(extractErrorMessage(error, 'Failed to load the audit log')).toBe(
      'Failed to load the audit log (502). Please try again.',
    );
  });
});

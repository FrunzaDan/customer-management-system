import { HttpErrorResponse } from '@angular/common/http';
import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { toServerErrors } from './server-errors';

describe('toServerErrors', () => {
  const createForm = () =>
    form(
      signal({
        email: '',
        city: '',
        schedule: { monday: '' },
      }),
      { injector: TestBed.inject(Injector) },
    );

  const problem = (status: number, errors?: Record<string, string[]>) =>
    new HttpErrorResponse({
      status,
      error: { title: 'Conflict', detail: 'Something went wrong.', errors },
    });

  it("puts a validation problem's errors on the fields they name, ignoring case", () => {
    const customerForm = createForm();

    const result = toServerErrors(
      problem(409, { Email: ['Email already exists.'] }),
      customerForm,
      'Failed to save',
    );

    expect(result.message).toBeNull();
    expect(result.fieldErrors).toEqual([
      {
        kind: 'server',
        message: 'Email already exists.',
        fieldTree: customerForm.email,
      },
    ]);
  });

  it('follows nested keys, and falls back to the last segment for a flatter form', () => {
    const customerForm = createForm();

    const result = toServerErrors(
      problem(400, {
        'schedule.monday': ['Pick a time.'],
        'address.city': ['City is too long.'],
      }),
      customerForm,
      'Failed to save',
    );

    expect(result.fieldErrors.map((error) => error.fieldTree)).toEqual([
      customerForm.schedule.monday,
      customerForm.city,
    ]);
  });

  it('leaves errors for fields the form does not have in the message', () => {
    const result = toServerErrors(
      problem(400, {
        email: ['Email already exists.'],
        scholarId: ['Scholar ID must not be empty.'],
      }),
      createForm(),
      'Failed to save',
    );

    expect(result.fieldErrors.length).toBe(1);
    expect(result.message).toBe('Scholar ID must not be empty.');
  });

  it('uses the usual message when the problem names no fields', () => {
    const result = toServerErrors(problem(409), createForm(), 'Failed to save');

    expect(result.fieldErrors).toEqual([]);
    expect(result.message).toBe('Something went wrong.');
  });

  it('reports an unreachable server', () => {
    const result = toServerErrors(
      new HttpErrorResponse({ status: 0 }),
      createForm(),
      'Failed to save',
    );

    expect(result.fieldErrors).toEqual([]);
    expect(result.message).toContain('Could not reach the server');
  });
});

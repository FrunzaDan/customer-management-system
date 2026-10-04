import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import {
  emptyCustomerForm,
  customerFormSchema,
  isCustomerFormDirty,
  toCreateCustomerRequest,
} from './customer-form';
import { environment } from '../../../environments/environment';

describe('isCustomerFormDirty', () => {
  it('is false when nothing differs from the baseline', () => {
    expect(isCustomerFormDirty(emptyCustomerForm(), emptyCustomerForm())).toBe(
      false,
    );
  });

  it('is true when any single field differs', () => {
    const changed = { ...emptyCustomerForm(), postalCode: '400000' };

    expect(isCustomerFormDirty(changed, emptyCustomerForm())).toBe(true);
  });

  it('is false again once a changed value is put back', () => {
    const baseline = { ...emptyCustomerForm(), firstName: 'Dan' };
    const edited = { ...baseline, firstName: 'Daniel' };
    const reverted = { ...edited, firstName: 'Dan' };

    expect(isCustomerFormDirty(edited, baseline)).toBe(true);
    expect(isCustomerFormDirty(reverted, baseline)).toBe(false);
  });
});

describe('environment.emailRegex', () => {
  const emailRegex = new RegExp(environment.emailRegex);

  it('accepts a plain address', () => {
    expect(emailRegex.test('ana.pop@example.com')).toBe(true);
  });

  it.each(['a@b@c.com', 'ana pop@example.com', 'ana@example', '@example.com'])(
    'rejects %s',
    (email) => {
      expect(emailRegex.test(email)).toBe(false);
    },
  );
});

describe('toCreateCustomerRequest', () => {
  it('sends gender as a number, nests the address and leaves blank optional values out', () => {
    const request = toCreateCustomerRequest({
      ...emptyCustomerForm(),
      enrollmentDate: '',
      gender: '2',
      city: 'Cluj-Napoca',
    });

    expect(request.gender).toBe(2);
    expect(request.address.city).toBe('Cluj-Napoca');
    expect(request.birthDate).toBeUndefined();
    expect(request.enrollmentDate).toBeUndefined();
  });
});

describe('customerFormSchema', () => {
  const birthDateErrors = (birthDate: string) =>
    TestBed.runInInjectionContext(() =>
      form(signal({ ...emptyCustomerForm(), birthDate }), customerFormSchema),
    )
      .birthDate()
      .errors()
      .map((error) => error.message);

  it('rejects a birth date in the future', () => {
    expect(birthDateErrors('2999-01-01')).toContain(
      'Birth date cannot be in the future',
    );
  });

  it('accepts a birth date in the past', () => {
    expect(birthDateErrors('1990-01-01')).toEqual([]);
  });
});

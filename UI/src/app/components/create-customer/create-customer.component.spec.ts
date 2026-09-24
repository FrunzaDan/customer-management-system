import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CustomerService } from '../../services/customer.service';
import { CustomerFormModel } from '../customer-form-fields/customer-form';
import { CreateCustomerComponent } from './create-customer.component';

describe('CreateCustomerComponent', () => {
  let createCustomer: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let component: CreateCustomerComponent;

  const validModel: CustomerFormModel = {
    firstName: 'Dan',
    lastName: 'Frunza',
    email: 'dan@example.com',
    phoneNumber: '123456789',
    gender: '1',
    birthDate: '1990-01-01',
    country: 'Romania',
    county: 'Cluj',
    city: 'Cluj-Napoca',
    street: 'Main',
    streetNumber: '1',
    postalCode: '400000',
  };

  beforeEach(() => {
    createCustomer = vi
      .fn()
      .mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    navigate = vi.fn().mockResolvedValue(true);

    // The component resolves its dependencies (and builds its signal form) in
    // field initializers, so it needs an active injection context.
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: CustomerService, useValue: { createCustomer } },
      ],
    });

    component = TestBed.runInInjectionContext(
      () => new CreateCustomerComponent(),
    );
  });

  it('does not call the service and reports the errors when the form is invalid', async () => {
    await submit(component.customerForm);

    expect(createCustomer).not.toHaveBeenCalled();
    expect(component.invalidSummary()).toBe(
      'The form has 12 errors. Please correct the highlighted fields.',
    );
  });

  it('validates the email and phone formats', () => {
    component.model.set({
      ...validModel,
      email: 'not-an-email',
      phoneNumber: '12',
    });

    expect(component.customerForm.email().errors()[0].message).toBe(
      'The Email should be a valid one',
    );
    expect(component.customerForm.phoneNumber().errors()[0].message).toBe(
      'The phone number should be a valid one',
    );
  });

  it('maps the form value into a Customer (gender as a number, address nested) and registers it', async () => {
    component.model.set(validModel);

    await submit(component.customerForm);

    expect(createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Dan',
        lastName: 'Frunza',
        email: 'dan@example.com',
        phoneNumber: '123456789',
        gender: 1,
        birthDate: '1990-01-01',
        address: {
          country: 'Romania',
          county: 'Cluj',
          city: 'Cluj-Napoca',
          street: 'Main',
          streetNumber: '1',
          postalCode: '400000',
        },
      }),
    );
  });

  it('navigates to the customer list on success', async () => {
    component.model.set(validModel);

    await submit(component.customerForm);

    expect(navigate).toHaveBeenCalledWith(['/customers']);
    expect(component.errorMessage()).toBeNull();
  });

  it('sets a friendly message and stops submitting on a network error (status 0)', async () => {
    createCustomer.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    component.model.set(validModel);

    await submit(component.customerForm);

    expect(component.customerForm().submitting()).toBe(false);
    expect(component.errorMessage()).toBe(
      'Could not reach the server. It may be offline, or your browser may not trust its security certificate.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('surfaces the server-provided message on a non-zero error status', async () => {
    createCustomer.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { title: 'Error', detail: 'Email already registered.' },
          }),
      ),
    );
    component.model.set(validModel);

    await submit(component.customerForm);

    expect(component.errorMessage()).toBe('Email already registered.');
  });

  describe('unsaved changes', () => {
    it('has none on a fresh form', () => {
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('has some as soon as the user types anything', () => {
      component.model.update((m) => ({ ...m, firstName: 'Dan' }));

      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('has none again if the field is emptied back out', () => {
      component.model.update((m) => ({ ...m, firstName: 'Dan' }));
      component.model.update((m) => ({ ...m, firstName: '' }));

      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('keeps them when the save fails, so the user is still warned', async () => {
      createCustomer.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      component.model.set(validModel);

      await submit(component.customerForm);

      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('clears them once the customer is saved, before navigating away', async () => {
      let dirtyAtNavigation: boolean | undefined;
      navigate.mockImplementation(async () => {
        dirtyAtNavigation = component.hasUnsavedChanges();
        return true;
      });
      component.model.set(validModel);

      await submit(component.customerForm);

      expect(dirtyAtNavigation).toBe(false);
    });

    it('asks the browser to confirm closing/reloading the tab only when dirty', () => {
      const clean = new Event('beforeunload', {
        cancelable: true,
      }) as BeforeUnloadEvent;
      component.onBeforeUnload(clean);
      expect(clean.defaultPrevented).toBe(false);

      component.model.update((m) => ({ ...m, firstName: 'Dan' }));
      const dirty = new Event('beforeunload', {
        cancelable: true,
      }) as BeforeUnloadEvent;
      component.onBeforeUnload(dirty);
      expect(dirty.defaultPrevented).toBe(true);
    });
  });
});

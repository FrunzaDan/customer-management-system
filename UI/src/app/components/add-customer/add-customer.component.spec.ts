import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AddCustomerService } from '../../services/add-customer.service';
import { CustomerFormModel } from '../customer-form-fields/customer-form';
import { AddCustomerComponent } from './add-customer.component';

describe('AddCustomerComponent', () => {
  let addCustomer: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let component: AddCustomerComponent;

  const validModel: CustomerFormModel = {
    firstName: 'Dan',
    lastName: 'Frunza',
    email: 'dan@example.com',
    msisdn: '123456789',
    gender: '1',
    birthdate: '1990-01-01',
    country: 'Romania',
    county: 'Cluj',
    town: 'Cluj-Napoca',
    street: 'Main',
    number: '1',
    zip: '400000',
  };

  beforeEach(() => {
    addCustomer = vi.fn().mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    navigate = vi.fn().mockResolvedValue(true);

    // The component resolves its dependencies (and builds its signal form) in
    // field initializers, so it needs an active injection context.
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: AddCustomerService, useValue: { addCustomer } },
      ],
    });

    component = TestBed.runInInjectionContext(() => new AddCustomerComponent());
  });

  it('does not call the service and reports the errors when the form is invalid', async () => {
    await submit(component.customerForm);

    expect(addCustomer).not.toHaveBeenCalled();
    expect(component.invalidSummary()).toBe(
      'The form has 12 errors. Please correct the highlighted fields.',
    );
  });

  it('validates the email and phone formats', () => {
    component.model.set({ ...validModel, email: 'not-an-email', msisdn: '12' });

    expect(component.customerForm.email().errors()[0].message).toBe(
      'The Email should be a valid one',
    );
    expect(component.customerForm.msisdn().errors()[0].message).toBe(
      'The phone number should be a valid one',
    );
  });

  it('maps the form value into a Customer (gender as a number, address nested) and registers it', async () => {
    component.model.set(validModel);

    await submit(component.customerForm);

    expect(addCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Dan',
        lastName: 'Frunza',
        email: 'dan@example.com',
        msisdn: '123456789',
        gender: 1,
        birthdate: '1990-01-01',
        address: {
          country: 'Romania',
          county: 'Cluj',
          town: 'Cluj-Napoca',
          street: 'Main',
          number: '1',
          zip: '400000',
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
    addCustomer.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    component.model.set(validModel);

    await submit(component.customerForm);

    expect(component.customerForm().submitting()).toBe(false);
    expect(component.errorMessage()).toBe(
      'Could not reach the server. It may be offline, or your browser does not trust its security certificate.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('surfaces the server-provided message on a non-zero error status', async () => {
    addCustomer.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { responseMessage: 'Email already registered.' },
          }),
      ),
    );
    component.model.set(validModel);

    await submit(component.customerForm);

    expect(component.errorMessage()).toBe('Email already registered.');
  });
});

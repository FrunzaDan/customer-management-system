import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AddCustomerService } from '../../services/add-customer.service';
import { AddCustomerComponent } from './add-customer.component';

describe('AddCustomerComponent', () => {
  let addCustomer: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let component: AddCustomerComponent;

  const validFormValue = {
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
    navigate = vi.fn();

    // The component resolves its dependencies via field-initializer inject()
    // calls, so it needs an active injection context (TestBed) to construct
    // — plain positional constructor args won't work here.
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: { navigate } },
        { provide: AddCustomerService, useValue: { addCustomer } },
      ],
    });

    component = TestBed.runInInjectionContext(() => new AddCustomerComponent());
    component.ngOnInit();
  });

  it('does not call the service and marks the form as submitted when the form is invalid', () => {
    component.onSubmit();

    expect(component.submitted()).toBe(true);
    expect(addCustomer).not.toHaveBeenCalled();
  });

  it('maps the form value into a Customer (gender as a number, address nested) and registers it', () => {
    component.form.setValue(validFormValue);

    component.onSubmit();

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

  it('navigates to the customer list relative to the current route on success', () => {
    component.form.setValue(validFormValue);

    component.onSubmit();

    expect(navigate).toHaveBeenCalledWith(['../customers'], { relativeTo: {} });
    expect(component.loading()).toBe(true);
  });

  it('sets a friendly message and stops loading on a network error (status 0)', () => {
    addCustomer.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    component.form.setValue(validFormValue);

    component.onSubmit();

    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBe(
      'Could not reach the server. It may be offline, or your browser does not trust its security certificate.',
    );
  });

  it('surfaces the server-provided message on a non-zero error status', () => {
    addCustomer.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { responseMessage: 'Email already registered.' },
          }),
      ),
    );
    component.form.setValue(validFormValue);

    component.onSubmit();

    expect(component.errorMessage()).toBe('Email already registered.');
  });
});

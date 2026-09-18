import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Customer } from '../../interfaces/customer-response';
import { GetCustomerService } from '../../services/get-customer.service';
import { EditCustomerService } from '../../services/edit-customer.service';
import { EditCustomerComponent } from './edit-customer.component';

describe('EditCustomerComponent', () => {
  let getCustomer: ReturnType<typeof vi.fn>;
  let editCustomer: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let selectedCustomer: ReturnType<typeof signal<Customer | null>>;
  let component: EditCustomerComponent;

  const buildCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    guid: 'guid-1',
    firstName: 'Dan',
    lastName: 'Frunza',
    msisdn: '123456789',
    email: 'dan@example.com',
    gender: 1,
    customerStatus: 1901,
    creationDate: '2026-01-01',
    interactionDate: '2026-01-01',
    birthdate: '1990-01-01',
    address: {
      country: 'Romania',
      county: 'Cluj',
      town: 'Cluj-Napoca',
      zip: '400000',
      street: 'Main',
      number: '1',
    },
    ...overrides,
  });

  beforeEach(() => {
    getCustomer = vi.fn();
    editCustomer = vi.fn().mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    navigate = vi.fn();
    selectedCustomer = signal<Customer | null>(null);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ id: 'guid-1' }) },
          },
        },
        { provide: Router, useValue: { navigate } },
        {
          provide: GetCustomerService,
          useValue: {
            selectedCustomerSignal: selectedCustomer,
            loadingSignal: signal(false),
            errorSignal: signal<string | null>(null),
            getCustomer,
          },
        },
        { provide: EditCustomerService, useValue: { editCustomer } },
      ],
    });

    component = TestBed.runInInjectionContext(() => new EditCustomerComponent());
  });

  describe('ngOnInit', () => {
    it('reads the id from the route and fetches that customer', () => {
      component.ngOnInit();

      expect(getCustomer).toHaveBeenCalledWith('guid-1');
    });
  });

  describe('patching the form from the loaded customer', () => {
    it('pre-fills every field, converting gender to a string', () => {
      selectedCustomer.set(buildCustomer({ gender: 2 }));
      TestBed.flushEffects();

      expect(component.form.controls.firstName.value).toBe('Dan');
      expect(component.form.controls.gender.value).toBe('2');
      expect(component.form.controls.country.value).toBe('Romania');
    });

    it('zero-pads an unpadded stored birthdate before patching the date input', () => {
      selectedCustomer.set(buildCustomer({ birthdate: '2020-1-5' }));
      TestBed.flushEffects();

      expect(component.form.controls.birthdate.value).toBe('2020-01-05');
    });

    it('leaves the birthdate blank when the stored value is not a full date', () => {
      selectedCustomer.set(buildCustomer({ birthdate: '2020' }));
      TestBed.flushEffects();

      expect(component.form.controls.birthdate.value).toBe('');
    });
  });

  describe('onSubmit', () => {
    it('does nothing when the form is invalid', () => {
      selectedCustomer.set(buildCustomer());
      TestBed.flushEffects();
      component.form.controls.firstName.setValue('');

      component.onSubmit();

      expect(component.submitted()).toBe(true);
      expect(editCustomer).not.toHaveBeenCalled();
    });

    it('does nothing when no customer has been loaded yet', () => {
      component.onSubmit();

      expect(editCustomer).not.toHaveBeenCalled();
    });

    it('merges the form values onto the loaded customer and saves', () => {
      selectedCustomer.set(buildCustomer({ guid: 'guid-1', creationDate: '2026-01-01' }));
      TestBed.flushEffects();
      component.form.controls.firstName.setValue('Updated');

      component.onSubmit();

      expect(editCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          guid: 'guid-1',
          creationDate: '2026-01-01', // preserved from the original record, not in the form
          firstName: 'Updated',
        }),
      );
    });

    it('navigates back to the customer list on success', () => {
      selectedCustomer.set(buildCustomer());
      TestBed.flushEffects();

      component.onSubmit();

      expect(navigate).toHaveBeenCalledWith(['../customers'], {
        relativeTo: expect.anything(),
      });
    });

    it('surfaces the error and stops saving on failure', () => {
      selectedCustomer.set(buildCustomer());
      TestBed.flushEffects();
      editCustomer.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { responseMessage: 'Email already registered.' },
            }),
        ),
      );

      component.onSubmit();

      expect(component.saving()).toBe(false);
      expect(component.saveError()).toBe('Email already registered.');
    });
  });
});

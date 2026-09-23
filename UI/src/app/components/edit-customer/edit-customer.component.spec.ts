import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { submit } from '@angular/forms/signals';
import { Router, provideRouter } from '@angular/router';
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

  // `id` is what withComponentInputBinding() binds from `?id=`.
  const createComponent = (id: string | null = 'guid-1') => {
    const fixture = TestBed.createComponent(EditCustomerComponent);
    if (id) fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  beforeEach(() => {
    getCustomer = vi.fn();
    editCustomer = vi.fn().mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    navigate = vi.fn().mockResolvedValue(true);
    selectedCustomer = signal<Customer | null>(null);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
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
    // RouterLink in the template needs the real Router; only stub navigate().
    TestBed.inject(Router).navigate = navigate as unknown as Router['navigate'];
  });

  describe('loading by id', () => {
    it('fetches the customer named by the id input', () => {
      createComponent('guid-1');

      expect(getCustomer).toHaveBeenCalledWith('guid-1');
    });

    it('does not fetch when there is no id', () => {
      createComponent(null);

      expect(getCustomer).not.toHaveBeenCalled();
    });
  });

  describe('form model derived from the loaded customer', () => {
    it('starts empty until a customer is loaded', () => {
      const component = createComponent();

      expect(component.model().firstName).toBe('');
    });

    it('pre-fills every field, converting gender to a string', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ gender: 2 }));

      expect(component.model().firstName).toBe('Dan');
      expect(component.model().gender).toBe('2');
      expect(component.model().country).toBe('Romania');
    });

    it('pre-fills the stored birthdate as-is (the API always sends YYYY-MM-DD)', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ birthdate: '2020-01-05' }));

      expect(component.model().birthdate).toBe('2020-01-05');
    });

    it('leaves the birthdate blank when the customer has none', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ birthdate: undefined }));

      expect(component.model().birthdate).toBe('');
    });
  });

  describe('submitting', () => {
    it('does nothing and reports the errors when the form is invalid', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());
      component.model.update((m) => ({ ...m, firstName: '' }));

      await submit(component.customerForm);

      expect(editCustomer).not.toHaveBeenCalled();
      expect(component.invalidSummary()).toBe(
        'The form has 1 error. Please correct the highlighted fields.',
      );
    });

    it('does nothing when no customer has been loaded yet', async () => {
      const component = createComponent();
      component.model.set({ ...component.model(), ...toModel(buildCustomer()) });

      await submit(component.customerForm);

      expect(editCustomer).not.toHaveBeenCalled();
    });

    it('merges the form values onto the loaded customer and saves', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ guid: 'guid-1', creationDate: '2026-01-01' }));
      component.model.update((m) => ({ ...m, firstName: 'Updated' }));

      await submit(component.customerForm);

      expect(editCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          guid: 'guid-1',
          creationDate: '2026-01-01', // preserved from the original record, not in the form
          firstName: 'Updated',
          gender: 1,
        }),
      );
    });

    it('navigates back to the customer list on success', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());

      await submit(component.customerForm);

      expect(navigate).toHaveBeenCalledWith(['/customers']);
    });

    it('surfaces the error and stops submitting on failure', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());
      editCustomer.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { responseMessage: 'Email already registered.' },
            }),
        ),
      );

      await submit(component.customerForm);

      expect(component.customerForm().submitting()).toBe(false);
      expect(component.saveError()).toBe('Email already registered.');
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('unsaved changes', () => {
    it('has none after the customer loads (loading is not editing)', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());

      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('has some once the user changes a field', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());
      component.model.update((m) => ({ ...m, firstName: 'Updated' }));

      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('has none again if the user puts the original value back', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());
      component.model.update((m) => ({ ...m, firstName: 'Updated' }));
      component.model.update((m) => ({ ...m, firstName: 'Dan' }));

      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('keeps them when the save fails', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());
      editCustomer.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.model.update((m) => ({ ...m, firstName: 'Updated' }));

      await submit(component.customerForm);

      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('clears them once saved, before navigating away', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());
      let dirtyAtNavigation: boolean | undefined;
      navigate.mockImplementation(async () => {
        dirtyAtNavigation = component.hasUnsavedChanges();
        return true;
      });
      component.model.update((m) => ({ ...m, firstName: 'Updated' }));

      await submit(component.customerForm);

      expect(dirtyAtNavigation).toBe(false);
    });

    it('asks the browser to confirm closing/reloading the tab only when dirty', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());

      const clean = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
      component.onBeforeUnload(clean);
      expect(clean.defaultPrevented).toBe(false);

      component.model.update((m) => ({ ...m, firstName: 'Updated' }));
      const dirty = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
      component.onBeforeUnload(dirty);
      expect(dirty.defaultPrevented).toBe(true);
    });
  });

  // Local helper: the same mapping the component uses, to build a valid model
  // without a loaded customer.
  function toModel(customer: Customer) {
    return {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      msisdn: customer.msisdn,
      gender: String(customer.gender),
      birthdate: customer.birthdate ?? '',
      country: customer.address.country,
      county: customer.address.county,
      town: customer.address.town,
      street: customer.address.street,
      number: customer.address.number,
      zip: customer.address.zip,
    };
  }
});

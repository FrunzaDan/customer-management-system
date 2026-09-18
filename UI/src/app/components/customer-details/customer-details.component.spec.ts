import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  Customer,
  CustomerActivationStatus,
} from '../../interfaces/customer-response';
import { ActivateCustomerService } from '../../services/activate-customer.service';
import { AuditLogService } from '../../services/audit-log.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { DeleteCustomerService } from '../../services/delete-customer.service';
import { GetCustomerService } from '../../services/get-customer.service';
import { CustomerDetailsComponent } from './customer-details.component';

describe('CustomerDetailsComponent', () => {
  let getCustomer: ReturnType<typeof vi.fn>;
  let loadAuditLog: ReturnType<typeof vi.fn>;
  let deactivateCustomer: ReturnType<typeof vi.fn>;
  let reactivateCustomer: ReturnType<typeof vi.fn>;
  let deleteCustomer: ReturnType<typeof vi.fn>;
  let confirm: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let selectedCustomer: ReturnType<typeof signal<Customer | null>>;
  let activationLoading: ReturnType<typeof signal<boolean>>;

  const buildCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    guid: 'guid-1',
    firstName: 'Dan',
    lastName: 'Frunza',
    msisdn: '123456789',
    email: 'dan@example.com',
    gender: 1,
    customerStatus: CustomerActivationStatus.Active,
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

  // routeParamId controls what ActivatedRoute.queryParamMap emits; set it
  // before calling createComponent() in tests that need the "no id" case.
  let routeParamId: string | null = 'guid-1';

  const createComponent = (): CustomerDetailsComponent => {
    getCustomer = vi.fn();
    loadAuditLog = vi.fn();
    deactivateCustomer = vi.fn();
    reactivateCustomer = vi.fn();
    deleteCustomer = vi.fn().mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    confirm = vi.fn().mockResolvedValue(true);
    navigate = vi.fn();
    selectedCustomer = signal<Customer | null>(null);
    activationLoading = signal(false);

    // CustomerDetailsComponent resolves its dependencies via field-initializer
    // inject() calls, so it needs TestBed provider tokens (not positional
    // constructor args) plus an active injection context for the effect()
    // call in its constructor.
    TestBed.configureTestingModule({
      providers: [
        {
          provide: GetCustomerService,
          useValue: {
            selectedCustomerSignal: selectedCustomer,
            loadingSignal: signal(false),
            errorSignal: signal<string | null>(null),
            getCustomer,
          },
        },
        {
          provide: ActivateCustomerService,
          useValue: {
            loadingSignal: activationLoading,
            errorSignal: signal<string | null>(null),
            deactivateCustomer,
            reactivateCustomer,
          },
        },
        { provide: ConfirmDialogService, useValue: { confirm } },
        { provide: DeleteCustomerService, useValue: { deleteCustomer } },
        {
          provide: AuditLogService,
          useValue: {
            entriesSignal: signal([]),
            loadingSignal: signal(false),
            errorSignal: signal<string | null>(null),
            loadAuditLog,
          },
        },
        { provide: Router, useValue: { navigate } },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap(routeParamId ? { id: routeParamId } : {})),
          },
        },
      ],
    });

    return TestBed.runInInjectionContext(() => new CustomerDetailsComponent());
  };

  beforeEach(() => {
    routeParamId = 'guid-1';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ngOnInit', () => {
    it('fetches the customer and its audit log using the id query param', () => {
      const component = createComponent();

      component.ngOnInit();

      expect(getCustomer).toHaveBeenCalledWith('guid-1');
      expect(loadAuditLog).toHaveBeenCalledWith('guid-1');
    });

    it('navigates home instead of fetching when there is no id query param', () => {
      routeParamId = null;
      const component = createComponent();

      component.ngOnInit();

      expect(getCustomer).not.toHaveBeenCalled();
      expect(loadAuditLog).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['']);
    });
  });

  describe('computed labels', () => {
    it('customerGender maps the numeric code to a label', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ gender: 2 }));

      expect(component.customerGender()).toBe('female');
    });

    it('customerStatusLabel maps the status code to a label', () => {
      const component = createComponent();
      selectedCustomer.set(
        buildCustomer({ customerStatus: CustomerActivationStatus.Deactivated }),
      );

      expect(component.customerStatusLabel()).toBe('Deactivated');
    });

    it('both are undefined when no customer is loaded', () => {
      const component = createComponent();

      expect(component.customerGender()).toBeUndefined();
      expect(component.customerStatusLabel()).toBeUndefined();
    });
  });

  describe('canDelete', () => {
    it('is false for an Active customer', () => {
      const component = createComponent();
      selectedCustomer.set(
        buildCustomer({ customerStatus: CustomerActivationStatus.Active }),
      );

      expect(component.canDelete()).toBe(false);
    });

    it('is true for a Deactivated customer', () => {
      const component = createComponent();
      selectedCustomer.set(
        buildCustomer({ customerStatus: CustomerActivationStatus.Deactivated }),
      );

      expect(component.canDelete()).toBe(true);
    });

    it('is true for a Test customer (exempt from the deactivate-first rule)', () => {
      const component = createComponent();
      selectedCustomer.set(
        buildCustomer({ customerStatus: CustomerActivationStatus.Test }),
      );

      expect(component.canDelete()).toBe(true);
    });
  });

  describe('navigateToEdit', () => {
    it('navigates to editCustomer with the current guid', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ guid: 'guid-1' }));

      component.navigateToEdit();

      expect(navigate).toHaveBeenCalledWith(['/editCustomer'], {
        queryParams: { id: 'guid-1' },
      });
    });

    it('does nothing when no customer is loaded', () => {
      const component = createComponent();

      component.navigateToEdit();

      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('deactivateCustomer / reactivateCustomer', () => {
    it('deactivateCustomer asks for confirmation before delegating to the service', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ guid: 'guid-1' }));

      await component.deactivateCustomer();

      expect(confirm).toHaveBeenCalled();
      expect(deactivateCustomer).toHaveBeenCalledWith('guid-1');
    });

    it('deactivateCustomer does nothing when the user cancels', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ guid: 'guid-1' }));
      confirm.mockResolvedValue(false);

      await component.deactivateCustomer();

      expect(deactivateCustomer).not.toHaveBeenCalled();
    });

    it('reactivateCustomer delegates directly, without a confirmation prompt', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ guid: 'guid-1' }));

      component.reactivateCustomer();

      expect(confirm).not.toHaveBeenCalled();
      expect(reactivateCustomer).toHaveBeenCalledWith('guid-1');
    });
  });

  describe('deleteCustomer', () => {
    it('does nothing when the user cancels the confirmation', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ guid: 'guid-1' }));
      confirm.mockResolvedValue(false);

      await component.deleteCustomer();

      expect(deleteCustomer).not.toHaveBeenCalled();
    });

    it('deletes the customer and navigates back to the list on success', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ guid: 'guid-1' }));

      await component.deleteCustomer();

      expect(deleteCustomer).toHaveBeenCalledWith('guid-1');
      expect(navigate).toHaveBeenCalledWith(['/customers']);
    });

    it('surfaces the error and stops loading when the delete request fails', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ guid: 'guid-1' }));
      deleteCustomer.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { responseMessage: 'Customer must be deactivated first.' },
            }),
        ),
      );

      await component.deleteCustomer();

      expect(component.deleting()).toBe(false);
      expect(component.deleteError()).toBe('Customer must be deactivated first.');
    });
  });

  describe('audit log reload on activation-loading transition', () => {
    it('reloads the audit log once a deactivate/reactivate call resolves (true -> false)', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ guid: 'guid-1' }));
      loadAuditLog.mockClear();

      activationLoading.set(true);
      TestBed.flushEffects();
      expect(loadAuditLog).not.toHaveBeenCalled();

      activationLoading.set(false);
      TestBed.flushEffects();

      expect(loadAuditLog).toHaveBeenCalledWith('guid-1');
    });

    it('does not reload on the initial false state (no prior true)', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ guid: 'guid-1' }));
      loadAuditLog.mockClear();

      TestBed.flushEffects();

      expect(loadAuditLog).not.toHaveBeenCalled();
    });
  });
});

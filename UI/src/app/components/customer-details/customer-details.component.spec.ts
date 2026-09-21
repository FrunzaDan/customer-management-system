import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
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
import { ProductService } from '../../services/product.service';
import { PurchaseService } from '../../services/purchase.service';
import { Product } from '../../interfaces/product';
import { CustomerDetailsComponent } from './customer-details.component';

describe('CustomerDetailsComponent', () => {
  let getCustomer: ReturnType<typeof vi.fn>;
  let loadAuditLog: ReturnType<typeof vi.fn>;
  let loadPurchases: ReturnType<typeof vi.fn>;
  let loadProducts: ReturnType<typeof vi.fn>;
  let purchaseProduct: ReturnType<typeof vi.fn>;
  let products: ReturnType<typeof signal<Product[]>>;
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

  const buildProduct = (overrides: Partial<Product> = {}): Product => ({
    guid: 'product-1',
    name: 'Aerobook 14 Pro',
    category: 'Laptop',
    comment: '14-inch ultraportable.',
    price: 1299,
    inventoryQuantity: 10,
    stockQuantity: 5,
    soldQuantity: 5,
    depot: 'Central Depot',
    ...overrides,
  });

  // routeParamId is what withComponentInputBinding() would bind to the `id`
  // input from `?id=`; set it to null before createComponent() for the "no id" case.
  let routeParamId: string | null = 'guid-1';

  const createComponent = (): CustomerDetailsComponent => {
    getCustomer = vi.fn();
    loadAuditLog = vi.fn();
    loadPurchases = vi.fn();
    loadProducts = vi.fn();
    purchaseProduct = vi.fn().mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    products = signal<Product[]>([]);
    deactivateCustomer = vi.fn();
    reactivateCustomer = vi.fn();
    deleteCustomer = vi.fn().mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    confirm = vi.fn().mockResolvedValue(true);
    navigate = vi.fn().mockResolvedValue(true);
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
        {
          provide: PurchaseService,
          useValue: {
            entriesSignal: signal([]),
            loadingSignal: signal(false),
            errorSignal: signal<string | null>(null),
            loadPurchases,
            purchaseProduct,
          },
        },
        {
          provide: ProductService,
          useValue: {
            productsSignal: products,
            loadingSignal: signal(false),
            errorSignal: signal<string | null>(null),
            loadProducts,
          },
        },
        provideRouter([]),
      ],
    });

    // RouterLink in the template needs the real Router; only stub navigate().
    TestBed.inject(Router).navigate = navigate as unknown as Router['navigate'];

    const fixture = TestBed.createComponent(CustomerDetailsComponent);
    if (routeParamId) fixture.componentRef.setInput('id', routeParamId);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  beforeEach(() => {
    routeParamId = 'guid-1';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loading by id', () => {
    it('fetches the customer, its audit log and its purchases using the id input', () => {
      createComponent();

      expect(getCustomer).toHaveBeenCalledWith('guid-1');
      expect(loadAuditLog).toHaveBeenCalledWith('guid-1');
      expect(loadPurchases).toHaveBeenCalledWith('guid-1');
    });

    it('loads the product catalogue for the purchase picker', () => {
      createComponent();

      expect(loadProducts).toHaveBeenCalled();
    });

    it('navigates home instead of fetching when there is no id', () => {
      routeParamId = null;
      createComponent();

      expect(getCustomer).not.toHaveBeenCalled();
      expect(loadAuditLog).not.toHaveBeenCalled();
      expect(loadPurchases).not.toHaveBeenCalled();
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
  describe('purchases', () => {
    it('canPurchase is true for Active and Test customers, false for Deactivated', () => {
      const component = createComponent();

      selectedCustomer.set(buildCustomer({ customerStatus: CustomerActivationStatus.Active }));
      expect(component.canPurchase()).toBe(true);

      selectedCustomer.set(buildCustomer({ customerStatus: CustomerActivationStatus.Test }));
      expect(component.canPurchase()).toBe(true);

      selectedCustomer.set(buildCustomer({ customerStatus: CustomerActivationStatus.Deactivated }));
      expect(component.canPurchase()).toBe(false);
    });

    it('groups the catalogue by category', () => {
      const component = createComponent();
      products.set([
        buildProduct({ guid: 'p1', category: 'Laptop' }),
        buildProduct({ guid: 'p2', category: 'Laptop' }),
        buildProduct({ guid: 'p3', category: 'Mouse' }),
      ]);

      const groups = component.productGroups();

      expect(groups.map((g) => g.category)).toEqual(['Laptop', 'Mouse']);
      expect(groups[0].products.map((p) => p.guid)).toEqual(['p1', 'p2']);
    });

    it('canSubmitPurchase needs a picked, in-stock product for a customer who can buy', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());
      products.set([
        buildProduct({ guid: 'in-stock', stockQuantity: 3 }),
        buildProduct({ guid: 'sold-out', stockQuantity: 0 }),
      ]);

      expect(component.canSubmitPurchase()).toBe(false); // nothing picked

      component.selectedProductGuid.set('sold-out');
      expect(component.canSubmitPurchase()).toBe(false); // out of stock

      component.selectedProductGuid.set('in-stock');
      expect(component.canSubmitPurchase()).toBe(true);

      selectedCustomer.set(buildCustomer({ customerStatus: CustomerActivationStatus.Deactivated }));
      expect(component.canSubmitPurchase()).toBe(false); // deactivated customer
    });

    it('recordPurchase posts the pick, resets it, and refreshes purchases, stock and audit trail', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ guid: 'guid-1' }));
      products.set([buildProduct({ guid: 'product-1' })]);
      component.selectedProductGuid.set('product-1');
      loadPurchases.mockClear();
      loadProducts.mockClear();
      loadAuditLog.mockClear();

      component.recordPurchase();

      expect(purchaseProduct).toHaveBeenCalledWith('guid-1', 'product-1');
      expect(component.selectedProductGuid()).toBe('');
      expect(component.purchasing()).toBe(false);
      expect(loadPurchases).toHaveBeenCalledWith('guid-1');
      expect(loadProducts).toHaveBeenCalled();
      expect(loadAuditLog).toHaveBeenCalledWith('guid-1');
    });

    it('recordPurchase does nothing when no product is picked', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());

      component.recordPurchase();

      expect(purchaseProduct).not.toHaveBeenCalled();
    });

    it('recordPurchase does nothing for a product that is out of stock', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());
      products.set([buildProduct({ guid: 'sold-out', stockQuantity: 0 })]);
      component.selectedProductGuid.set('sold-out');

      component.recordPurchase();

      expect(purchaseProduct).not.toHaveBeenCalled();
    });

    it('surfaces the server message, stops loading and re-fetches stock when the purchase fails', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ guid: 'guid-1' }));
      products.set([buildProduct({ guid: 'product-1' })]);
      component.selectedProductGuid.set('product-1');
      loadProducts.mockClear();
      loadPurchases.mockClear();
      purchaseProduct.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { responseMessage: 'Product is out of stock.' },
            }),
        ),
      );

      component.recordPurchase();

      expect(component.purchasing()).toBe(false);
      expect(component.purchaseError()).toBe('Product is out of stock.');
      expect(component.selectedProductGuid()).toBe('product-1'); // pick kept
      expect(loadProducts).toHaveBeenCalled(); // stock shown is stale
      expect(loadPurchases).not.toHaveBeenCalled(); // nothing was recorded
    });
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Customer, CustomerStatus } from '../../interfaces/customer-response';
import { CustomerService } from '../../services/customer.service';
import { AuditLogService } from '../../services/audit-log.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ProductService } from '../../services/product.service';
import { PurchaseService } from '../../services/purchase.service';
import { Product } from '../../interfaces/product';
import { Purchase } from '../../interfaces/purchase';
import { CustomerDetailsComponent } from './customer-details.component';

describe('CustomerDetailsComponent', () => {
  let getCustomer: ReturnType<typeof vi.fn>;
  let loadAuditLog: ReturnType<typeof vi.fn>;
  let loadPurchases: ReturnType<typeof vi.fn>;
  let loadProducts: ReturnType<typeof vi.fn>;
  let purchaseProduct: ReturnType<typeof vi.fn>;
  let products: ReturnType<typeof signal<Product[]>>;
  let purchases: ReturnType<typeof signal<Purchase[]>>;
  let deactivateCustomer: ReturnType<typeof vi.fn>;
  let reactivateCustomer: ReturnType<typeof vi.fn>;
  let deleteCustomer: ReturnType<typeof vi.fn>;
  let confirm: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let selectedCustomer: ReturnType<typeof signal<Customer | null>>;
  let activationLoading: ReturnType<typeof signal<boolean>>;

  const buildCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    customerId: 'customer-1',
    firstName: 'Dan',
    lastName: 'Frunza',
    phoneNumber: '123456789',
    email: 'dan@example.com',
    gender: 1,
    status: CustomerStatus.Active,
    createdAt: '2026-01-01',
    lastInteractionAt: '2026-01-01',
    birthDate: '1990-01-01',
    address: {
      country: 'Romania',
      county: 'Cluj',
      city: 'Cluj-Napoca',
      postalCode: '400000',
      street: 'Main',
      streetNumber: '1',
    },
    ...overrides,
  });

  const buildProduct = (overrides: Partial<Product> = {}): Product => ({
    productId: 'product-1',
    name: 'Aerobook 14 Pro',
    category: 'Laptop',
    description: '14-inch ultraportable.',
    price: 1299,
    initialQuantity: 10,
    quantityOnHand: 5,
    soldQuantity: 5,
    warehouse: 'Central Depot',
    ...overrides,
  });

  // routeParamId is what withComponentInputBinding() would bind to the `customerId`
  // input from the `:customerId` route param; set it to null before createComponent() for the "no id" case.
  let routeParamId: string | null = 'customer-1';

  const createComponent = (): CustomerDetailsComponent => {
    getCustomer = vi.fn();
    loadAuditLog = vi.fn();
    loadPurchases = vi.fn();
    loadProducts = vi.fn();
    purchaseProduct = vi
      .fn()
      .mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    products = signal<Product[]>([]);
    purchases = signal<Purchase[]>([]);
    deactivateCustomer = vi.fn();
    reactivateCustomer = vi.fn();
    deleteCustomer = vi
      .fn()
      .mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
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
          provide: CustomerService,
          useValue: {
            selectedCustomer: selectedCustomer,
            loading: signal(false),
            error: signal<string | null>(null),
            getCustomer,
            activationLoading,
            activationError: signal<string | null>(null),
            deactivateCustomer,
            reactivateCustomer,
            deleteCustomer,
          },
        },
        { provide: ConfirmDialogService, useValue: { confirm } },
        {
          provide: AuditLogService,
          useValue: {
            entries: signal([]),
            loading: signal(false),
            error: signal<string | null>(null),
            loadAuditLog,
          },
        },
        {
          provide: PurchaseService,
          useValue: {
            entries: purchases,
            loading: signal(false),
            error: signal<string | null>(null),
            loadPurchases,
            purchaseProduct,
          },
        },
        {
          provide: ProductService,
          useValue: {
            products: products,
            loading: signal(false),
            error: signal<string | null>(null),
            loadProducts,
          },
        },
        provideRouter([]),
      ],
    });

    // RouterLink in the template needs the real Router; only stub navigate().
    TestBed.inject(Router).navigate = navigate as unknown as Router['navigate'];

    const fixture = TestBed.createComponent(CustomerDetailsComponent);
    if (routeParamId) fixture.componentRef.setInput('customerId', routeParamId);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  beforeEach(() => {
    routeParamId = 'customer-1';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loading by id', () => {
    it('fetches the customer, its audit log and its purchases using the id input', () => {
      createComponent();

      expect(getCustomer).toHaveBeenCalledWith('customer-1');
      expect(loadAuditLog).toHaveBeenCalledWith('customer-1');
      expect(loadPurchases).toHaveBeenCalledWith('customer-1');
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
        buildCustomer({ status: CustomerStatus.Deactivated }),
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
      selectedCustomer.set(buildCustomer({ status: CustomerStatus.Active }));

      expect(component.canDelete()).toBe(false);
    });

    it('is true for a Deactivated customer', () => {
      const component = createComponent();
      selectedCustomer.set(
        buildCustomer({ status: CustomerStatus.Deactivated }),
      );

      expect(component.canDelete()).toBe(true);
    });

    it('is true for a Test customer (exempt from the deactivate-first rule)', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ status: CustomerStatus.Test }));

      expect(component.canDelete()).toBe(true);
    });
  });

  describe('deactivateCustomer / reactivateCustomer', () => {
    it('deactivateCustomer asks for confirmation before delegating to the service', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ customerId: 'customer-1' }));

      await component.deactivateCustomer();

      expect(confirm).toHaveBeenCalled();
      expect(deactivateCustomer).toHaveBeenCalledWith('customer-1');
    });

    it('deactivateCustomer does nothing when the user cancels', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ customerId: 'customer-1' }));
      confirm.mockResolvedValue(false);

      await component.deactivateCustomer();

      expect(deactivateCustomer).not.toHaveBeenCalled();
    });

    it('reactivateCustomer delegates directly, without a confirmation prompt', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ customerId: 'customer-1' }));

      component.reactivateCustomer();

      expect(confirm).not.toHaveBeenCalled();
      expect(reactivateCustomer).toHaveBeenCalledWith('customer-1');
    });
  });

  describe('deleteCustomer', () => {
    it('does nothing when the user cancels the confirmation', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ customerId: 'customer-1' }));
      confirm.mockResolvedValue(false);

      await component.deleteCustomer();

      expect(deleteCustomer).not.toHaveBeenCalled();
    });

    it('deletes the customer and navigates back to the list on success', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ customerId: 'customer-1' }));

      await component.deleteCustomer();

      expect(deleteCustomer).toHaveBeenCalledWith('customer-1');
      expect(navigate).toHaveBeenCalledWith(['/customers']);
    });

    it('surfaces the error and stops loading when the delete request fails', async () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ customerId: 'customer-1' }));
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
      expect(component.deleteError()).toBe(
        'Customer must be deactivated first.',
      );
    });
  });

  describe('audit log reload on activation-loading transition', () => {
    it('reloads the audit log once a deactivate/reactivate call resolves (true -> false)', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ customerId: 'customer-1' }));
      loadAuditLog.mockClear();

      activationLoading.set(true);
      TestBed.flushEffects();
      expect(loadAuditLog).not.toHaveBeenCalled();

      activationLoading.set(false);
      TestBed.flushEffects();

      expect(loadAuditLog).toHaveBeenCalledWith('customer-1');
    });

    it('does not reload on the initial false state (no prior true)', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ customerId: 'customer-1' }));
      loadAuditLog.mockClear();

      TestBed.flushEffects();

      expect(loadAuditLog).not.toHaveBeenCalled();
    });
  });
  describe('purchases', () => {
    it('canPurchase is true for Active and Test customers, false for Deactivated', () => {
      const component = createComponent();

      selectedCustomer.set(buildCustomer({ status: CustomerStatus.Active }));
      expect(component.canPurchase()).toBe(true);

      selectedCustomer.set(buildCustomer({ status: CustomerStatus.Test }));
      expect(component.canPurchase()).toBe(true);

      selectedCustomer.set(
        buildCustomer({ status: CustomerStatus.Deactivated }),
      );
      expect(component.canPurchase()).toBe(false);
    });

    it('totalSpent sums the purchase prices, exactly to the cent', () => {
      const component = createComponent();
      const buildPurchase = (id: number, price: number): Purchase => ({
        customerPurchaseId: id,
        customerId: 'customer-1',
        productId: `product-${id}`,
        productName: `Product ${id}`,
        category: 'Laptop',
        price,
        purchasedAt: '2026-01-01',
      });

      expect(component.totalSpent()).toBe(0); // no purchases yet

      purchases.set([
        buildPurchase(1, 0.1),
        buildPurchase(2, 0.2),
        buildPurchase(3, 1299),
      ]);
      expect(component.totalSpent()).toBe(1299.3); // plain float addition gives 1299.3000000000002

      // The same product bought twice counts twice.
      purchases.set([buildPurchase(1, 49.99), buildPurchase(2, 49.99)]);
      expect(component.totalSpent()).toBe(99.98);
    });

    it('groups the catalogue by category', () => {
      const component = createComponent();
      products.set([
        buildProduct({ productId: 'p1', category: 'Laptop' }),
        buildProduct({ productId: 'p2', category: 'Laptop' }),
        buildProduct({ productId: 'p3', category: 'Mouse' }),
      ]);

      const groups = component.productGroups();

      expect(groups.map((g) => g.category)).toEqual(['Laptop', 'Mouse']);
      expect(groups[0].products.map((p) => p.productId)).toEqual(['p1', 'p2']);
    });

    it('canSubmitPurchase needs a picked, in-stock product for a customer who can buy', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer());
      products.set([
        buildProduct({ productId: 'in-stock', quantityOnHand: 3 }),
        buildProduct({ productId: 'sold-out', quantityOnHand: 0 }),
      ]);

      expect(component.canSubmitPurchase()).toBe(false); // nothing picked

      component.selectedProductId.set('sold-out');
      expect(component.canSubmitPurchase()).toBe(false); // out of stock

      component.selectedProductId.set('in-stock');
      expect(component.canSubmitPurchase()).toBe(true);

      selectedCustomer.set(
        buildCustomer({ status: CustomerStatus.Deactivated }),
      );
      expect(component.canSubmitPurchase()).toBe(false); // deactivated customer
    });

    it('recordPurchase posts the pick, resets it, and refreshes purchases, stock and audit trail', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ customerId: 'customer-1' }));
      products.set([buildProduct({ productId: 'product-1' })]);
      component.selectedProductId.set('product-1');
      loadPurchases.mockClear();
      loadProducts.mockClear();
      loadAuditLog.mockClear();

      component.recordPurchase();

      expect(purchaseProduct).toHaveBeenCalledWith('customer-1', 'product-1');
      expect(component.selectedProductId()).toBe('');
      expect(component.purchasing()).toBe(false);
      expect(loadPurchases).toHaveBeenCalledWith('customer-1');
      expect(loadProducts).toHaveBeenCalled();
      expect(loadAuditLog).toHaveBeenCalledWith('customer-1');
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
      products.set([
        buildProduct({ productId: 'sold-out', quantityOnHand: 0 }),
      ]);
      component.selectedProductId.set('sold-out');

      component.recordPurchase();

      expect(purchaseProduct).not.toHaveBeenCalled();
    });

    it('surfaces the server message, stops loading and re-fetches stock when the purchase fails', () => {
      const component = createComponent();
      selectedCustomer.set(buildCustomer({ customerId: 'customer-1' }));
      products.set([buildProduct({ productId: 'product-1' })]);
      component.selectedProductId.set('product-1');
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
      expect(component.selectedProductId()).toBe('product-1'); // pick kept
      expect(loadProducts).toHaveBeenCalled(); // stock shown is stale
      expect(loadPurchases).not.toHaveBeenCalled(); // nothing was recorded
    });
  });
});

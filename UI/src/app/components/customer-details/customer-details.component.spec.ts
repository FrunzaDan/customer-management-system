import { HttpErrorResponse } from '@angular/common/http';
import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ReplaySubject, of, throwError } from 'rxjs';
import { Customer, CustomerStatus } from '../../interfaces/customer';
import { CustomerService } from '../../services/customer.service';
import { AuditLogService } from '../../services/audit-log.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ProductService } from '../../services/product.service';
import { PurchaseService } from '../../services/purchase.service';
import { Product } from '../../interfaces/product';
import { Purchase } from '../../interfaces/purchase';
import { AuditLogEntry } from '../../interfaces/audit-log-entry';
import { CustomerDetailsComponent } from './customer-details.component';

describe('CustomerDetailsComponent', () => {
  let getCustomer: ReturnType<typeof vi.fn>;
  let bindAuditLog: ReturnType<typeof vi.fn>;
  let reloadAuditLog: ReturnType<typeof vi.fn>;
  let bindPurchases: ReturnType<typeof vi.fn>;
  let reloadPurchases: ReturnType<typeof vi.fn>;
  let loadProducts: ReturnType<typeof vi.fn>;
  let purchaseProduct: ReturnType<typeof vi.fn>;
  let products: ReturnType<typeof signal<Product[]>>;
  let purchases: ReturnType<typeof signal<Purchase[]>>;
  let deactivateCustomer: ReturnType<typeof vi.fn>;
  let reactivateCustomer: ReturnType<typeof vi.fn>;
  let deleteCustomer: ReturnType<typeof vi.fn>;
  let confirm: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let customer$: ReplaySubject<Customer>;
  let fixture: ComponentFixture<CustomerDetailsComponent>;

  const loadCustomer = async (customer: Customer) => {
    customer$.next(customer);
    await fixture.whenStable();
  };
  let activationLoading: ReturnType<typeof signal<boolean>>;

  const buildCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    customerId: 'customer-1',
    firstName: 'Dan',
    lastName: 'Frunza',
    phoneNumber: '123456789',
    email: 'dan@example.com',
    gender: 1,
    status: CustomerStatus.Active,
    enrollmentDate: '2015-06-01',
    accountCreatedAt: '2026-01-01',
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

  let routeParamId: string | null = 'customer-1';

  const createComponent = (): CustomerDetailsComponent => {
    customer$ = new ReplaySubject<Customer>(1);
    getCustomer = vi.fn(() => customer$);
    bindAuditLog = vi.fn();
    reloadAuditLog = vi.fn();
    bindPurchases = vi.fn();
    reloadPurchases = vi.fn();
    loadProducts = vi.fn();
    purchaseProduct = vi
      .fn()
      .mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    products = signal<Product[]>([]);
    purchases = signal<Purchase[]>([]);
    deactivateCustomer = vi.fn().mockResolvedValue(true);
    reactivateCustomer = vi.fn().mockResolvedValue(true);
    deleteCustomer = vi
      .fn()
      .mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    confirm = vi.fn().mockResolvedValue(true);
    navigate = vi.fn().mockResolvedValue(true);
    activationLoading = signal(false);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: CustomerService,
          useValue: {
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
            bindAuditLog,
            reloadAuditLog,
          },
        },
        {
          provide: PurchaseService,
          useValue: {
            entries: purchases,
            loading: signal(false),
            error: signal<string | null>(null),
            bindPurchases,
            reloadPurchases,
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

    TestBed.inject(Router).navigate = navigate as unknown as Router['navigate'];

    fixture = TestBed.createComponent(CustomerDetailsComponent);
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
    it('fetches the customer, and binds its audit log and purchases to the id input', () => {
      const component = createComponent();

      expect(getCustomer).toHaveBeenCalledWith('customer-1');
      expect(bindAuditLog).toHaveBeenCalledWith(component.customerId);
      expect(bindPurchases).toHaveBeenCalledWith(component.customerId);
    });

    it('loads the product catalogue for the purchase picker', () => {
      createComponent();

      expect(loadProducts).toHaveBeenCalled();
    });
  });

  describe('computed labels', () => {
    it('genderLabel maps the numeric code to a label', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ gender: 2 }));

      expect(component.genderLabel()).toBe('female');
    });

    it('statusLabel maps the status code to a label', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ status: CustomerStatus.Deactivated }));

      expect(component.statusLabel()).toBe('Deactivated');
    });

    it('both are undefined when no customer is loaded', () => {
      const component = createComponent();

      expect(component.genderLabel()).toBeUndefined();
      expect(component.statusLabel()).toBeUndefined();
    });
  });

  describe('canDelete', () => {
    it('is false for an Active customer', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ status: CustomerStatus.Active }));

      expect(component.canDelete()).toBe(false);
    });

    it('is true for a Deactivated customer', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ status: CustomerStatus.Deactivated }));

      expect(component.canDelete()).toBe(true);
    });

    it('is true for a Test customer (exempt from the deactivate-first rule)', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ status: CustomerStatus.Test }));

      expect(component.canDelete()).toBe(true);
    });
  });

  describe('deactivateCustomer / reactivateCustomer', () => {
    it('deactivateCustomer asks for confirmation before delegating to the service', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ customerId: 'customer-1' }));

      await component.deactivateCustomer();

      expect(confirm).toHaveBeenCalled();
      expect(deactivateCustomer).toHaveBeenCalledWith('customer-1');
    });

    it('deactivateCustomer does nothing when the user cancels', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ customerId: 'customer-1' }));
      confirm.mockResolvedValue(false);

      await component.deactivateCustomer();

      expect(deactivateCustomer).not.toHaveBeenCalled();
    });

    it('reactivateCustomer delegates directly, without a confirmation prompt', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ customerId: 'customer-1' }));

      await component.reactivateCustomer();

      expect(confirm).not.toHaveBeenCalled();
      expect(reactivateCustomer).toHaveBeenCalledWith('customer-1');
    });
  });

  describe('deleteCustomer', () => {
    it('does nothing when the user cancels the confirmation', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ customerId: 'customer-1' }));
      confirm.mockResolvedValue(false);

      await component.deleteCustomer();

      expect(deleteCustomer).not.toHaveBeenCalled();
    });

    it('deletes the customer and navigates back to the list on success', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ customerId: 'customer-1' }));

      await component.deleteCustomer();

      expect(deleteCustomer).toHaveBeenCalledWith('customer-1');
      expect(navigate).toHaveBeenCalledWith(['/customers']);
    });

    it('surfaces the error and stops loading when the delete request fails', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ customerId: 'customer-1' }));
      deleteCustomer.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: {
                title: 'Error',
                detail: 'Customer must be deactivated first.',
              },
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

  describe('refresh after a status change', () => {
    it('reloads the customer and its audit log once the status change succeeds', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ customerId: 'customer-1' }));

      await component.deactivateCustomer();
      TestBed.tick();

      expect(reloadAuditLog).toHaveBeenCalledTimes(1);
      expect(getCustomer).toHaveBeenCalledTimes(2);
    });

    it('does not reload when the status change fails', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ customerId: 'customer-1' }));
      reactivateCustomer.mockResolvedValue(false);

      await component.reactivateCustomer();
      TestBed.tick();

      expect(reloadAuditLog).not.toHaveBeenCalled();
      expect(getCustomer).toHaveBeenCalledTimes(1);
    });
  });

  describe('purchases', () => {
    it('canPurchase is true for Active and Test customers, false for Deactivated', async () => {
      const component = createComponent();

      await loadCustomer(buildCustomer({ status: CustomerStatus.Active }));
      expect(component.canPurchase()).toBe(true);

      await loadCustomer(buildCustomer({ status: CustomerStatus.Test }));
      expect(component.canPurchase()).toBe(true);

      await loadCustomer(buildCustomer({ status: CustomerStatus.Deactivated }));
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

      expect(component.totalSpent()).toBe(0);

      purchases.set([
        buildPurchase(1, 0.1),
        buildPurchase(2, 0.2),
        buildPurchase(3, 1299),
      ]);
      expect(component.totalSpent()).toBe(1299.3);

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

    it('canSubmitPurchase needs a picked, in-stock product for a customer who can buy', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer());
      products.set([
        buildProduct({ productId: 'in-stock', quantityOnHand: 3 }),
        buildProduct({ productId: 'sold-out', quantityOnHand: 0 }),
      ]);

      expect(component.canSubmitPurchase()).toBe(false);

      component.purchaseForm.productId().value.set('sold-out');
      expect(component.canSubmitPurchase()).toBe(false);

      component.purchaseForm.productId().value.set('in-stock');
      expect(component.canSubmitPurchase()).toBe(true);

      await loadCustomer(buildCustomer({ status: CustomerStatus.Deactivated }));
      expect(component.canSubmitPurchase()).toBe(false);
    });

    it('recordPurchase posts the pick, resets it, and refreshes purchases, stock and audit trail', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ customerId: 'customer-1' }));
      products.set([buildProduct({ productId: 'product-1' })]);
      component.purchaseForm.productId().value.set('product-1');
      loadProducts.mockClear();

      component.recordPurchase();

      expect(purchaseProduct).toHaveBeenCalledWith('customer-1', 'product-1');
      expect(component.selectedProductId()).toBe('');
      expect(component.purchasing()).toBe(false);
      expect(reloadPurchases).toHaveBeenCalled();
      expect(loadProducts).toHaveBeenCalled();
      expect(reloadAuditLog).toHaveBeenCalled();
    });

    it('recordPurchase does nothing when no product is picked', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer());

      component.recordPurchase();

      expect(purchaseProduct).not.toHaveBeenCalled();
    });

    it('recordPurchase does nothing for a product that is out of stock', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer());
      products.set([
        buildProduct({ productId: 'sold-out', quantityOnHand: 0 }),
      ]);
      component.purchaseForm.productId().value.set('sold-out');

      component.recordPurchase();

      expect(purchaseProduct).not.toHaveBeenCalled();
    });

    it('surfaces the server message, stops loading and re-fetches stock when the purchase fails', async () => {
      const component = createComponent();
      await loadCustomer(buildCustomer({ customerId: 'customer-1' }));
      products.set([buildProduct({ productId: 'product-1' })]);
      component.purchaseForm.productId().value.set('product-1');
      loadProducts.mockClear();
      purchaseProduct.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { title: 'Error', detail: 'Product is out of stock.' },
            }),
        ),
      );

      component.recordPurchase();

      expect(component.purchasing()).toBe(false);
      expect(component.purchaseError()).toBe('Product is out of stock.');
      expect(component.selectedProductId()).toBe('product-1');
      expect(loadProducts).toHaveBeenCalled();
      expect(reloadPurchases).not.toHaveBeenCalled();
    });
  });
  describe('audit trail preview', () => {
    const buildAuditLog = (count: number): AuditLogEntry[] =>
      Array.from({ length: count }, (_, i) => ({
        customerAuditLogId: count - i,
        customerId: 'customer-1',
        performedBy: 'admin',
        actionType: 'Edited',
        details: `change #${count - i}.`,
        occurredAt: '2026-01-01T00:00:00Z',
      }));

    const setAuditLog = (entries: AuditLogEntry[]) =>
      (
        TestBed.inject(AuditLogService).entries as WritableSignal<
          AuditLogEntry[]
        >
      ).set(entries);

    it('shows only the latest 10 actions followed by "…", which reveals the rest', async () => {
      createComponent();
      setAuditLog(buildAuditLog(12));
      await loadCustomer(buildCustomer());

      const items = () =>
        fixture.nativeElement.querySelectorAll('.audit-list li.audit-item');
      const more = () =>
        fixture.nativeElement.querySelector('.audit-more-button');

      expect(items().length).toBe(11);
      expect(more().textContent.trim()).toBe('…');
      expect(more().getAttribute('aria-label')).toBe('Show 2 older actions');
      expect(fixture.nativeElement.textContent).toContain('change #3.');
      expect(fixture.nativeElement.textContent).not.toContain('change #2.');

      more().click();
      await fixture.whenStable();

      expect(items().length).toBe(12);
      expect(more()).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('change #1.');
    });

    it('shows no "…" when there are 10 actions or fewer', async () => {
      createComponent();
      setAuditLog(buildAuditLog(10));
      await loadCustomer(buildCustomer());

      expect(
        fixture.nativeElement.querySelectorAll('.audit-list li.audit-item')
          .length,
      ).toBe(10);
      expect(
        fixture.nativeElement.querySelector('.audit-more-button'),
      ).toBeNull();
    });
  });
});

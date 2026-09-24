import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Product } from '../../interfaces/product';
import { CustomerService } from '../../services/customer.service';
import { NotificationService } from '../../services/notification.service';
import { ProductService } from '../../services/product.service';
import { PurchaseService } from '../../services/purchase.service';
import { AboutComponent } from './about.component';

describe('AboutComponent — createTestCustomers', () => {
  const buildProduct = (n: number, quantityOnHand = 100): Product => ({
    productId: `p${n}`,
    name: `Product ${n}`,
    category: 'Laptop',
    description: null,
    price: 100,
    initialQuantity: quantityOnHand,
    quantityOnHand,
    soldQuantity: 0,
    warehouse: 'Central Depot',
  });
  const catalogue = (size = 50, stock = 100) =>
    Array.from({ length: size }, (_, i) => buildProduct(i, stock));

  let registered: string[];
  let purchases: { customerId: string; productId: string }[];
  let fetchProducts: ReturnType<typeof vi.fn>;
  let createCustomerSilently: ReturnType<typeof vi.fn>;
  let purchaseProductSilently: ReturnType<typeof vi.fn>;
  let show: ReturnType<typeof vi.fn>;

  const createComponent = (products: Product[] = catalogue()) => {
    registered = [];
    purchases = [];
    fetchProducts = vi.fn().mockReturnValue(of(products));
    createCustomerSilently = vi.fn((customer: { email: string }) => {
      registered.push(customer.email);
      return of({
        status: 200,
        responseMessage: 'ok',
        data: `customer-for-${customer.email}`,
      });
    });
    purchaseProductSilently = vi.fn((customerId: string, productId: string) => {
      purchases.push({ customerId, productId });
      return of({ status: 200, responseMessage: 'ok' });
    });
    show = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: ProductService, useValue: { fetchProducts } },
        { provide: CustomerService, useValue: { createCustomerSilently } },
        { provide: PurchaseService, useValue: { purchaseProductSilently } },
        { provide: NotificationService, useValue: { show } },
      ],
    });
    return TestBed.runInInjectionContext(() => new AboutComponent());
  };

  const purchasesByCustomer = () => {
    const byCustomer = new Map<string, string[]>();
    for (const p of purchases) {
      byCustomer.set(p.customerId, [
        ...(byCustomer.get(p.customerId) ?? []),
        p.productId,
      ]);
    }
    return byCustomer;
  };

  afterEach(() => vi.restoreAllMocks());

  it('registers 50 test customers and gives every one of them 1 to 5 purchases', async () => {
    const component = createComponent();

    await component.createTestCustomers();

    expect(registered).toHaveLength(50);
    const byCustomer = purchasesByCustomer();
    expect(byCustomer.size).toBe(50);
    for (const products of byCustomer.values()) {
      expect(products.length).toBeGreaterThanOrEqual(1);
      expect(products.length).toBeLessThanOrEqual(5);
    }
  });

  it('gives each customer distinct products (no product twice for the same customer)', async () => {
    const component = createComponent();

    await component.createTestCustomers();

    for (const products of purchasesByCustomer().values()) {
      expect(new Set(products).size).toBe(products.length);
    }
  });

  it('spreads purchases over a varied number per customer, not one fixed count', async () => {
    const component = createComponent();

    await component.createTestCustomers();

    const counts = new Set(
      [...purchasesByCustomer().values()].map((p) => p.length),
    );
    expect(counts.size).toBeGreaterThan(1);
  });

  it('buys for each new customer by the GUID its registration returned', async () => {
    const component = createComponent();

    await component.createTestCustomers();

    const buyers = new Set(purchases.map((p) => p.customerId));
    expect([...buyers].sort()).toEqual(
      registered.map((email) => `customer-for-${email}`).sort(),
    );
  });

  it('never buys a product that is out of stock', async () => {
    const products = [
      ...catalogue(20).map((p) => ({ ...p, quantityOnHand: 0 })),
      buildProduct(99),
      buildProduct(98),
    ];
    const component = createComponent(products);

    await component.createTestCustomers();

    expect(purchases.length).toBeGreaterThan(0);
    for (const p of purchases) expect(['p99', 'p98']).toContain(p.productId);
  });

  it('never buys more units of a product than it has in stock', async () => {
    const products = [buildProduct(0, 3), ...catalogue(30).slice(1)];
    const component = createComponent(products);

    await component.createTestCustomers();

    expect(
      purchases.filter((p) => p.productId === 'p0').length,
    ).toBeLessThanOrEqual(3);
  });

  it('draws again when every product it picked is rejected, so the customer still ends up with one', async () => {
    const component = createComponent(catalogue(50));
    let attempts = 0;
    purchaseProductSilently.mockImplementation(
      (customerId: string, productId: string) => {
        if (attempts++ < 3) return throwError(() => new Error('409'));
        purchases.push({ customerId, productId });
        return of({ status: 200, responseMessage: 'ok' });
      },
    );

    await component.createTestCustomers();

    expect(purchasesByCustomer().size).toBe(50);
    expect(show).toHaveBeenCalledWith(
      expect.stringContaining('Added 50 test customers'),
      'success',
    );
  });

  it('reports customers who could not buy anything when the whole catalogue is sold out', async () => {
    const component = createComponent(catalogue(10, 0));

    await component.createTestCustomers();

    expect(registered).toHaveLength(50);
    expect(purchases).toHaveLength(0);
    expect(show).toHaveBeenCalledWith(
      expect.stringContaining('50 could not buy anything'),
      'error',
    );
  });

  it('aborts before creating anything when the catalogue cannot be loaded', async () => {
    const component = createComponent();
    fetchProducts.mockReturnValue(throwError(() => new Error('boom')));

    await component.createTestCustomers();

    expect(createCustomerSilently).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith(
      expect.stringContaining('Could not load the product catalogue'),
      'error',
    );
    expect(component.addingTestCustomers()).toBe(false);
  });

  it('counts a customer whose registration failed as failed, and does not try to buy for it', async () => {
    const component = createComponent();
    let n = 0;
    createCustomerSilently.mockImplementation((customer: { email: string }) => {
      if (n++ === 0) return throwError(() => new Error('400'));
      registered.push(customer.email);
      return of({
        status: 200,
        responseMessage: 'ok',
        data: `customer-for-${customer.email}`,
      });
    });

    await component.createTestCustomers();

    expect(new Set(purchases.map((p) => p.customerId)).size).toBe(49);
    expect(show).toHaveBeenCalledWith(
      expect.stringContaining('Added 49 test customers'),
      'error',
    );
    expect(show).toHaveBeenCalledWith(
      expect.stringContaining('1 failed'),
      'error',
    );
  });

  it('reports the total in the summary and shows a single notification', async () => {
    const component = createComponent();

    await component.createTestCustomers();

    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith(
      `Added 50 test customers with ${purchases.length} purchases.`,
      'success',
    );
  });

  it('ignores a second click while a run is in progress', async () => {
    const component = createComponent();

    const first = component.createTestCustomers();
    await component.createTestCustomers();
    await first;

    expect(fetchProducts).toHaveBeenCalledTimes(1);
    expect(registered).toHaveLength(50);
  });

  it('clears the in-progress flag when done', async () => {
    const component = createComponent();

    await component.createTestCustomers();

    expect(component.addingTestCustomers()).toBe(false);
  });
});

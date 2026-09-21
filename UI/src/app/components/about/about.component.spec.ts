import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Product } from '../../interfaces/product';
import { AddCustomerService } from '../../services/add-customer.service';
import { GetCustomerService } from '../../services/get-customer.service';
import { NotificationService } from '../../services/notification.service';
import { ProductService } from '../../services/product.service';
import { PurchaseService } from '../../services/purchase.service';
import { AboutComponent } from './about.component';

describe('AboutComponent — addTestCustomers', () => {
  const buildProduct = (n: number, stockQuantity = 100): Product => ({
    guid: `p${n}`,
    name: `Product ${n}`,
    category: 'Laptop',
    comment: null,
    price: 100,
    inventoryQuantity: stockQuantity,
    stockQuantity,
    soldQuantity: 0,
    depot: 'Central Depot',
  });
  const catalogue = (size = 50, stock = 100) => Array.from({ length: size }, (_, i) => buildProduct(i, stock));

  let registered: string[]; // emails, in registration order
  let purchases: { customerGuid: string; productGuid: string }[];
  let fetchProducts: ReturnType<typeof vi.fn>;
  let addCustomerSilently: ReturnType<typeof vi.fn>;
  let purchaseProductSilently: ReturnType<typeof vi.fn>;
  let findCustomerGuid: ReturnType<typeof vi.fn>;
  let show: ReturnType<typeof vi.fn>;

  const createComponent = (products: Product[] = catalogue()) => {
    registered = [];
    purchases = [];
    fetchProducts = vi.fn().mockReturnValue(of(products));
    addCustomerSilently = vi.fn((customer: { email: string }) => {
      registered.push(customer.email);
      return of({ status: 200, responseMessage: 'ok' });
    });
    findCustomerGuid = vi.fn((email: string) => of(`guid-for-${email}`));
    purchaseProductSilently = vi.fn((customerGuid: string, productGuid: string) => {
      purchases.push({ customerGuid, productGuid });
      return of({ status: 200, responseMessage: 'ok' });
    });
    show = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: ProductService, useValue: { fetchProducts } },
        { provide: AddCustomerService, useValue: { addCustomerSilently } },
        { provide: GetCustomerService, useValue: { findCustomerGuid } },
        { provide: PurchaseService, useValue: { purchaseProductSilently } },
        { provide: NotificationService, useValue: { show } },
      ],
    });
    return TestBed.runInInjectionContext(() => new AboutComponent());
  };

  const purchasesByCustomer = () => {
    const byCustomer = new Map<string, string[]>();
    for (const p of purchases) {
      byCustomer.set(p.customerGuid, [...(byCustomer.get(p.customerGuid) ?? []), p.productGuid]);
    }
    return byCustomer;
  };

  afterEach(() => vi.restoreAllMocks());

  it('registers 50 test customers and gives every one of them 1 to 5 purchases', async () => {
    const component = createComponent();

    await component.addTestCustomers();

    expect(registered).toHaveLength(50);
    const byCustomer = purchasesByCustomer();
    expect(byCustomer.size).toBe(50); // nobody left without a purchase
    for (const products of byCustomer.values()) {
      expect(products.length).toBeGreaterThanOrEqual(1);
      expect(products.length).toBeLessThanOrEqual(5);
    }
  });

  it('gives each customer distinct products (no product twice for the same customer)', async () => {
    const component = createComponent();

    await component.addTestCustomers();

    for (const products of purchasesByCustomer().values()) {
      expect(new Set(products).size).toBe(products.length);
    }
  });

  it('spreads purchases over a varied number per customer, not one fixed count', async () => {
    const component = createComponent();

    await component.addTestCustomers();

    const counts = new Set([...purchasesByCustomer().values()].map((p) => p.length));
    expect(counts.size).toBeGreaterThan(1);
  });

  it('looks each new customer up by the email it was registered with', async () => {
    const component = createComponent();

    await component.addTestCustomers();

    expect(findCustomerGuid.mock.calls.map((c) => c[0])).toEqual(registered);
  });

  it('never buys a product that is out of stock', async () => {
    const products = [...catalogue(20).map((p) => ({ ...p, stockQuantity: 0 })), buildProduct(99), buildProduct(98)];
    const component = createComponent(products);

    await component.addTestCustomers();

    expect(purchases.length).toBeGreaterThan(0);
    for (const p of purchases) expect(['p99', 'p98']).toContain(p.productGuid);
  });

  it('never buys more units of a product than it has in stock', async () => {
    // 3 units of one product among plenty of others: it must stop being offered after 3 sales
    const products = [buildProduct(0, 3), ...catalogue(30).slice(1)];
    const component = createComponent(products);

    await component.addTestCustomers();

    expect(purchases.filter((p) => p.productGuid === 'p0').length).toBeLessThanOrEqual(3);
  });

  it('draws again when every product it picked is rejected, so the customer still ends up with one', async () => {
    const component = createComponent(catalogue(50));
    // Reject the first 3 attempts overall (e.g. someone else took the stock), then accept.
    let attempts = 0;
    purchaseProductSilently.mockImplementation((customerGuid: string, productGuid: string) => {
      if (attempts++ < 3) return throwError(() => new Error('409'));
      purchases.push({ customerGuid, productGuid });
      return of({ status: 200, responseMessage: 'ok' });
    });

    await component.addTestCustomers();

    expect(purchasesByCustomer().size).toBe(50);
    expect(show).toHaveBeenCalledWith(expect.stringContaining('Added 50 test customers'), 'success');
  });

  it('reports customers who could not buy anything when the whole catalogue is sold out', async () => {
    const component = createComponent(catalogue(10, 0));

    await component.addTestCustomers();

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

    await component.addTestCustomers();

    expect(addCustomerSilently).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith(expect.stringContaining('Could not load the product catalogue'), 'error');
    expect(component.addingTestCustomers()).toBe(false);
  });

  it('counts a customer whose registration failed as failed, and does not try to buy for it', async () => {
    const component = createComponent();
    let n = 0;
    addCustomerSilently.mockImplementation((customer: { email: string }) => {
      if (n++ === 0) return throwError(() => new Error('400'));
      registered.push(customer.email);
      return of({ status: 200, responseMessage: 'ok' });
    });

    await component.addTestCustomers();

    expect(findCustomerGuid).toHaveBeenCalledTimes(49);
    expect(show).toHaveBeenCalledWith(expect.stringContaining('Added 49 test customers'), 'error');
    expect(show).toHaveBeenCalledWith(expect.stringContaining('1 failed'), 'error');
  });

  it('reports the total in the summary and shows a single notification', async () => {
    const component = createComponent();

    await component.addTestCustomers();

    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith(`Added 50 test customers with ${purchases.length} purchases.`, 'success');
  });

  it('ignores a second click while a run is in progress', async () => {
    const component = createComponent();

    const first = component.addTestCustomers();
    await component.addTestCustomers(); // re-entrant call
    await first;

    expect(fetchProducts).toHaveBeenCalledTimes(1);
    expect(registered).toHaveLength(50);
  });

  it('clears the in-progress flag when done', async () => {
    const component = createComponent();

    await component.addTestCustomers();

    expect(component.addingTestCustomers()).toBe(false);
  });
});

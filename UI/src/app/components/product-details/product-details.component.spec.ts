import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ProductDetails } from '../../interfaces/product-details';
import { ProductService } from '../../services/product.service';
import { Subject } from 'rxjs';
import { ProductDetailsComponent } from './product-details.component';

describe('ProductDetailsComponent', () => {
  let getProductDetails: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  // What the page's rxResource streams: nothing yet (loading), a value, or an error.
  let productDetails$: Subject<ProductDetails>;

  const buildDetails = (
    overrides: Partial<ProductDetails['product']> = {},
    buyers: ProductDetails['buyers'] = [],
  ): ProductDetails => ({
    product: {
      productId: 'product-1',
      name: 'Aerobook 14 Pro',
      category: 'Laptop',
      description: '14-inch ultraportable.',
      price: 1299,
      initialQuantity: 25,
      quantityOnHand: 23,
      soldQuantity: 2,
      warehouse: 'Central Depot',
      ...overrides,
    },
    buyers,
  });

  const buyer = (
    id: number,
    first: string,
    customerId = `customer-${id}`,
  ): ProductDetails['buyers'][number] => ({
    customerPurchaseId: id,
    customerId: customerId,
    customerFirstName: first,
    customerLastName: 'Shopper',
    customerEmail: `${first.toLowerCase()}@example.com`,
    purchasedAt: '2026-01-01T10:00:00',
  });

  let routeParamId: string | null = 'product-1';

  const render = () => {
    productDetails$ = new Subject<ProductDetails>();
    getProductDetails = vi.fn(() => productDetails$);
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ProductService,
          useValue: {
            getProductDetails,
          },
        },
        provideRouter([]),
      ],
    });
    TestBed.inject(Router).navigate = navigate as unknown as Router['navigate'];
    const fixture = TestBed.createComponent(ProductDetailsComponent);
    if (routeParamId) fixture.componentRef.setInput('productId', routeParamId);
    fixture.detectChanges();
    return fixture;
  };

  const el = (f: ReturnType<typeof render>) => f.nativeElement as HTMLElement;

  const show = async (
    fixture: ComponentFixture<ProductDetailsComponent>,
    details: ProductDetails,
  ) => {
    productDetails$.next(details);
    await fixture.whenStable();
  };

  const fail = async (
    fixture: ComponentFixture<ProductDetailsComponent>,
    detail: string,
  ) => {
    productDetails$.error(
      new HttpErrorResponse({
        status: 404,
        error: { title: 'Not Found', status: 404, detail },
      }),
    );
    await fixture.whenStable();
  };

  beforeEach(() => {
    routeParamId = 'product-1';
  });

  it('loads the product using the id input', () => {
    render();

    expect(getProductDetails).toHaveBeenCalledWith('product-1');
  });

  it('goes back to the products list when there is no id', () => {
    routeParamId = null;
    render();

    expect(getProductDetails).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/products']);
  });

  it('always renders exactly one <h1>, so focus and page structure survive every state', async () => {
    const loading = render();
    expect(el(loading).querySelectorAll('h1')).toHaveLength(1);
    TestBed.resetTestingModule();

    const failed = render();
    await fail(failed, 'Product not found.');
    expect(el(failed).querySelectorAll('h1')).toHaveLength(1);
    TestBed.resetTestingModule();

    const loaded = render();
    await show(loaded, buildDetails());
    expect(el(loaded).querySelector('h1')?.textContent?.trim()).toBe(
      'Aerobook 14 Pro',
    );
  });

  it('shows the error and a way back when loading failed', async () => {
    const fixture = render();
    await fail(fixture, 'Product not found.');

    expect(el(fixture).textContent).toContain('Product not found.');
    expect(el(fixture).querySelector('a[href="/products"]')).not.toBeNull();
  });

  it('shows sold, inventory and left', async () => {
    const fixture = render();
    await show(fixture, buildDetails());

    const stats = Array.from(el(fixture).querySelectorAll('.stat')).map((s) => [
      s.querySelector('dt')?.textContent?.trim(),
      s.querySelector('dd')?.textContent?.trim(),
    ]);
    expect(stats).toEqual([
      ['Sold', '2'],
      ['Inventory', '25'],
      ['Left', '23'],
    ]);
  });

  it('lists who bought it, linking each customer to their details page', async () => {
    const fixture = render();
    await show(
      fixture,
      buildDetails({}, [
        buyer(2, 'Ada', 'customer-ada'),
        buyer(1, 'Ivan', 'customer-ivan'),
      ]),
    );

    const rows = el(fixture).querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Ada Shopper');
    expect(rows[0].textContent).toContain('ada@example.com');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe(
      '/customers/customer-ada',
    );
  });

  it('says nobody has bought it yet when it has no sales', async () => {
    const fixture = render();
    await show(fixture, buildDetails({ soldQuantity: 0, quantityOnHand: 25 }));

    expect(el(fixture).textContent).toContain(
      'Nobody has bought this product yet.',
    );
    expect(el(fixture).querySelector('tbody')).toBeNull();
  });

  it('explains the gap when some sales were to since-deleted customers', async () => {
    const fixture = render();
    // 2 sold, but only 1 buyer still on record
    await show(fixture, buildDetails({}, [buyer(1, 'Ada')]));

    expect(el(fixture).textContent).toContain(
      '1 sale was made to customers that have since been deleted',
    );
  });

  it('flags a sold-out product', async () => {
    const fixture = render();
    await show(fixture, buildDetails({ quantityOnHand: 0, soldQuantity: 25 }));

    expect(el(fixture).textContent).toContain('This product is sold out.');
  });
});

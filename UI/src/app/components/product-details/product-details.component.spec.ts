import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ProductDetails } from '../../interfaces/product-details';
import { ProductDetailsService } from '../../services/product-details.service';
import { ProductDetailsComponent } from './product-details.component';

describe('ProductDetailsComponent', () => {
  let loadProductDetails: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let details: ReturnType<typeof signal<ProductDetails | null>>;
  let loading: ReturnType<typeof signal<boolean>>;
  let error: ReturnType<typeof signal<string | null>>;

  const buildDetails = (overrides: Partial<ProductDetails['product']> = {}, buyers: ProductDetails['buyers'] = []): ProductDetails => ({
    product: {
      guid: 'product-1',
      name: 'Aerobook 14 Pro',
      category: 'Laptop',
      comment: '14-inch ultraportable.',
      price: 1299,
      inventoryQuantity: 25,
      stockQuantity: 23,
      soldQuantity: 2,
      depot: 'Central Depot',
      ...overrides,
    },
    buyers,
  });

  const buyer = (id: number, first: string, guid = `guid-${id}`): ProductDetails['buyers'][number] => ({
    purchaseId: id,
    customerGuid: guid,
    customerFirstName: first,
    customerLastName: 'Shopper',
    customerEmail: `${first.toLowerCase()}@example.com`,
    purchaseDate: '2026-01-01T10:00:00',
  });

  let routeParamId: string | null = 'product-1';

  const render = () => {
    loadProductDetails = vi.fn();
    navigate = vi.fn().mockResolvedValue(true);
    details = signal<ProductDetails | null>(null);
    loading = signal(false);
    error = signal<string | null>(null);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ProductDetailsService,
          useValue: {
            detailsSignal: details,
            loadingSignal: loading,
            errorSignal: error,
            loadProductDetails,
          },
        },
        provideRouter([]),
      ],
    });
    TestBed.inject(Router).navigate = navigate as unknown as Router['navigate'];
    const fixture = TestBed.createComponent(ProductDetailsComponent);
    if (routeParamId) fixture.componentRef.setInput('id', routeParamId);
    fixture.detectChanges();
    return fixture;
  };

  const el = (f: ReturnType<typeof render>) => f.nativeElement as HTMLElement;

  beforeEach(() => {
    routeParamId = 'product-1';
  });

  it('loads the product using the id input', () => {
    render();

    expect(loadProductDetails).toHaveBeenCalledWith('product-1');
  });

  it('goes back to the products list when there is no id', () => {
    routeParamId = null;
    render();

    expect(loadProductDetails).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/products']);
  });

  it('always renders exactly one <h1>, so focus and page structure survive every state', () => {
    const fixture = render();
    expect(el(fixture).querySelectorAll('h1')).toHaveLength(1); // nothing loaded yet

    loading.set(true);
    fixture.detectChanges();
    expect(el(fixture).querySelectorAll('h1')).toHaveLength(1);

    loading.set(false);
    error.set('Product not found.');
    fixture.detectChanges();
    expect(el(fixture).querySelectorAll('h1')).toHaveLength(1);

    error.set(null);
    details.set(buildDetails());
    fixture.detectChanges();
    expect(el(fixture).querySelector('h1')?.textContent?.trim()).toBe('Aerobook 14 Pro');
  });

  it('shows the error and a way back when loading failed', () => {
    const fixture = render();
    error.set('Product not found.');
    fixture.detectChanges();

    expect(el(fixture).textContent).toContain('Product not found.');
    expect(el(fixture).querySelector('a[href="/products"]')).not.toBeNull();
  });

  it('shows sold, inventory and left', () => {
    const fixture = render();
    details.set(buildDetails());
    fixture.detectChanges();

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

  it('lists who bought it, linking each customer to their details page', () => {
    const fixture = render();
    details.set(buildDetails({}, [buyer(2, 'Ada', 'guid-ada'), buyer(1, 'Ivan', 'guid-ivan')]));
    fixture.detectChanges();

    const rows = el(fixture).querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Ada Shopper');
    expect(rows[0].textContent).toContain('ada@example.com');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/customerDetails?id=guid-ada');
  });

  it('says nobody has bought it yet when it has no sales', () => {
    const fixture = render();
    details.set(buildDetails({ soldQuantity: 0, stockQuantity: 25 }));
    fixture.detectChanges();

    expect(el(fixture).textContent).toContain('Nobody has bought this product yet.');
    expect(el(fixture).querySelector('tbody')).toBeNull();
  });

  it('explains the gap when some sales were to since-deleted customers', () => {
    const fixture = render();
    // 2 sold, but only 1 buyer still on record
    details.set(buildDetails({}, [buyer(1, 'Ada')]));
    fixture.detectChanges();

    expect(el(fixture).textContent).toContain('1 sale was made to customers that have since been deleted');
  });

  it('flags a sold-out product', () => {
    const fixture = render();
    details.set(buildDetails({ stockQuantity: 0, soldQuantity: 25 }));
    fixture.detectChanges();

    expect(el(fixture).textContent).toContain('This product is sold out.');
  });
});

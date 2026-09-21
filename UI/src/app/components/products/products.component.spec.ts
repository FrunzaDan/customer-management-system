import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Product } from '../../interfaces/product';
import { ProductService } from '../../services/product.service';
import { ProductsComponent } from './products.component';

describe('ProductsComponent', () => {
  let loadProducts: ReturnType<typeof vi.fn>;
  let products: ReturnType<typeof signal<Product[]>>;
  let loading: ReturnType<typeof signal<boolean>>;
  let error: ReturnType<typeof signal<string | null>>;

  const buildProduct = (overrides: Partial<Product> = {}): Product => ({
    guid: 'p1',
    name: 'Aerobook 14 Pro',
    category: 'Laptop',
    comment: null,
    price: 1299,
    inventoryQuantity: 25,
    stockQuantity: 20,
    soldQuantity: 5,
    depot: 'Central Depot',
    ...overrides,
  });

  const render = () => {
    loadProducts = vi.fn();
    products = signal<Product[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ProductService,
          useValue: {
            productsSignal: products,
            loadingSignal: loading,
            errorSignal: error,
            loadProducts,
          },
        },
        provideRouter([]),
      ],
    });
    const fixture = TestBed.createComponent(ProductsComponent);
    fixture.detectChanges();
    return fixture;
  };

  const text = (fixture: ReturnType<typeof render>) =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('fetches fresh products on entering the page (stock changes with every purchase)', () => {
    render();

    expect(loadProducts).toHaveBeenCalled();
  });

  it('shows a spinner while loading with nothing to show yet', () => {
    const fixture = render();
    loading.set(true);
    fixture.detectChanges();

    expect(text(fixture)).toContain('Loading products');
  });

  it('shows the error when loading failed', () => {
    const fixture = render();
    error.set('boom');
    fixture.detectChanges();

    expect(text(fixture)).toContain('boom');
  });

  it('renders a row per product with sold, inventory and left', () => {
    const fixture = render();
    products.set([
      buildProduct({ guid: 'p1', name: 'Aerobook 14 Pro' }),
      buildProduct({ guid: 'p2', name: 'Voltix K1', soldQuantity: 3, inventoryQuantity: 10, stockQuantity: 7 }),
    ]);
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    const cells = Array.from(rows[1].querySelectorAll('th, td')).map((c) => c.textContent?.trim());
    expect(cells).toEqual(['Voltix K1', 'Laptop', 'Central Depot', '1,299.00', '3', '10', '7']);
  });

  it('links each product to its details page by guid', () => {
    const fixture = render();
    products.set([buildProduct({ guid: 'abc-123' })]);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('tbody a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/productDetails?id=abc-123');
  });

  it('shows "Sold out" instead of 0 when nothing is left', () => {
    const fixture = render();
    products.set([buildProduct({ stockQuantity: 0, soldQuantity: 25 })]);
    fixture.detectChanges();

    const lastCell = (fixture.nativeElement as HTMLElement).querySelector('tbody tr td:last-child');
    expect(lastCell?.textContent?.trim()).toBe('Sold out');
  });
});

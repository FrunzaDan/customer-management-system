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
    productId: 'p1',
    name: 'Aerobook 14 Pro',
    category: 'Laptop',
    price: 1299,
    initialQuantity: 25,
    quantityOnHand: 20,
    soldQuantity: 5,
    warehouse: 'Central Depot',
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
            products: products,
            loading: loading,
            error: error,
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
      buildProduct({ productId: 'p1', name: 'Aerobook 14 Pro' }),
      buildProduct({ productId: 'p2', name: 'Voltix K1', soldQuantity: 3, initialQuantity: 10, quantityOnHand: 7 }),
    ]);
    fixture.detectChanges();

    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    const cells = Array.from(rows[1].querySelectorAll('th, td')).map((c) => c.textContent?.trim());
    expect(cells).toEqual(['Voltix K1', 'Laptop', 'Central Depot', '1,299.00', '3', '10', '7']);
  });

  it('links each product to its details page by productId', () => {
    const fixture = render();
    products.set([buildProduct({ productId: 'abc-123' })]);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('tbody a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/product-details?id=abc-123');
  });

  it('shows "Sold out" instead of 0 when nothing is left', () => {
    const fixture = render();
    products.set([buildProduct({ quantityOnHand: 0, soldQuantity: 25 })]);
    fixture.detectChanges();

    const lastCell = (fixture.nativeElement as HTMLElement).querySelector('tbody tr td:last-child');
    expect(lastCell?.textContent?.trim()).toBe('Sold out');
  });
  describe('sorting', () => {
    const names = (fixture: ReturnType<typeof render>) =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr th')).map((c) =>
        c.textContent?.trim(),
      );
    const header = (fixture: ReturnType<typeof render>, label: string) =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('thead th')).find((th) =>
        th.textContent?.includes(label),
      ) as HTMLElement;
    const click = (fixture: ReturnType<typeof render>, label: string) => {
      (header(fixture, label).querySelector('button') as HTMLButtonElement).click();
      fixture.detectChanges();
    };
    const seed = (fixture: ReturnType<typeof render>) => {
      products.set([
        buildProduct({ productId: 'a', name: 'Alpha', category: 'Mouse', price: 30, soldQuantity: 2, initialQuantity: 10, quantityOnHand: 8 }),
        buildProduct({ productId: 'b', name: 'Bravo', category: 'Laptop', price: 1200, soldQuantity: 9, initialQuantity: 10, quantityOnHand: 1 }),
        buildProduct({ productId: 'c', name: 'Charlie', category: 'Keyboard', price: 99.5, soldQuantity: 5, initialQuantity: 20, quantityOnHand: 15 }),
      ]);
      fixture.detectChanges();
    };

    it('keeps the API order until a header is clicked', () => {
      const fixture = render();
      seed(fixture);

      expect(names(fixture)).toEqual(['Alpha', 'Bravo', 'Charlie']);
      expect(header(fixture, 'Product').getAttribute('aria-sort')).toBe('none');
    });

    it('sorts text columns ascending on the first click and descending on the second', () => {
      const fixture = render();
      seed(fixture);

      click(fixture, 'Category');
      expect(names(fixture)).toEqual(['Charlie', 'Bravo', 'Alpha']); // Keyboard, Laptop, Mouse
      expect(header(fixture, 'Category').getAttribute('aria-sort')).toBe('ascending');

      click(fixture, 'Category');
      expect(names(fixture)).toEqual(['Alpha', 'Bravo', 'Charlie']);
      expect(header(fixture, 'Category').getAttribute('aria-sort')).toBe('descending');
    });

    it('sorts numeric columns by value, not as text (1200 > 99.5 > 30)', () => {
      const fixture = render();
      seed(fixture);

      click(fixture, 'Price');
      expect(names(fixture)).toEqual(['Alpha', 'Charlie', 'Bravo']);

      click(fixture, 'Price');
      expect(names(fixture)).toEqual(['Bravo', 'Charlie', 'Alpha']);
    });

    it('sorts Sold, Inventory and Left on their own quantities', () => {
      const fixture = render();
      seed(fixture);

      click(fixture, 'Sold');
      expect(names(fixture)).toEqual(['Alpha', 'Charlie', 'Bravo']);

      click(fixture, 'Inventory');
      expect(names(fixture)).toEqual(['Alpha', 'Bravo', 'Charlie']); // 10, 10, 20 (stable)

      click(fixture, 'Left');
      expect(names(fixture)).toEqual(['Bravo', 'Alpha', 'Charlie']); // 1, 8, 15
    });

    it('starts a newly clicked column ascending and moves the aria-sort to it', () => {
      const fixture = render();
      seed(fixture);

      click(fixture, 'Price');
      click(fixture, 'Price'); // now descending
      click(fixture, 'Product');

      expect(header(fixture, 'Product').getAttribute('aria-sort')).toBe('ascending');
      expect(header(fixture, 'Price').getAttribute('aria-sort')).toBe('none');
    });

    it('does not reorder the list the service owns', () => {
      const fixture = render();
      seed(fixture);

      click(fixture, 'Price');

      expect(products().map((p) => p.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
    });
  });
});

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateProductRequest, Product } from '../interfaces/product';
import { ProductDetails } from '../interfaces/product-details';
import { NotificationService } from './notification.service';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;
  let notificationShow: ReturnType<typeof vi.fn>;

  const API_URL = `${environment.apiUrl}/api/product`;

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

  beforeEach(() => {
    notificationShow = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: { show: notificationShow } },
      ],
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // The response is applied asynchronously, so wait for the app to settle
  // after flushing before asserting on the signals.
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  describe('products', () => {
    const PRODUCTS_URL = `${API_URL}/all`;

    // httpResource issues its request from an effect, so flush effects after
    // calling loadProducts() before expecting the HTTP call.
    const load = () => {
      service.loadProducts();
      TestBed.tick();
    };

    it('makes no request until loadProducts() is called', () => {
      TestBed.tick();

      httpMock.expectNone(PRODUCTS_URL);
      expect(service.products()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('populates products from a successful response', async () => {
      const product = buildProduct();

      load();
      httpMock
        .expectOne(PRODUCTS_URL)
        .flush({ status: 200, responseMessage: 'ok', data: [product] });
      await settle();

      expect(service.products()).toEqual([product]);
      expect(service.error()).toBeNull();
    });

    it('re-requests when loadProducts() is called again (stock changes with each purchase)', async () => {
      load();
      httpMock
        .expectOne(PRODUCTS_URL)
        .flush({ status: 200, responseMessage: 'ok', data: [buildProduct()] });
      await settle();

      load();

      httpMock.expectOne(PRODUCTS_URL).flush({
        status: 200,
        responseMessage: 'ok',
        data: [buildProduct({ quantityOnHand: 4 })],
      });
      await settle();
      expect(service.products()[0].quantityOnHand).toBe(4);
    });

    it('fetchProducts returns the catalogue as a value, without touching the resource signals', () => {
      const product = buildProduct();
      let result: Product[] | undefined;

      service.fetchProducts().subscribe((products) => (result = products));
      httpMock
        .expectOne(PRODUCTS_URL)
        .flush({ status: 200, responseMessage: 'ok', data: [product] });

      expect(result).toEqual([product]);
      expect(service.products()).toEqual([]); // the resource was never loaded
    });

    it('surfaces the server-provided error message when present', async () => {
      load();

      httpMock
        .expectOne(PRODUCTS_URL)
        .flush(
          { title: 'Server Error', status: 500, detail: 'boom' },
          { status: 500, statusText: 'Server Error' },
        );
      await settle();

      expect(service.loading()).toBe(false);
      expect(service.error()).toBe('boom');
      expect(service.products()).toEqual([]);
    });
  });

  describe('getProductDetails', () => {
    const DETAILS_URL = `${API_URL}/get`;

    const buildDetails = (): ProductDetails => ({
      product: buildProduct({ description: null }),
      buyers: [
        {
          customerPurchaseId: 1,
          customerId: 'customer-1',
          customerFirstName: 'Dan',
          customerLastName: 'Frunza',
          customerEmail: 'dan@example.com',
          purchasedAt: '2026-01-01T10:00:00',
        },
      ],
    });

    it('sends the productId as a query param and emits the product and its buyers', async () => {
      const details = buildDetails();

      const result = firstValueFrom(service.getProductDetails('product-1'));
      const req = httpMock.expectOne((r) => r.url === DETAILS_URL);
      expect(req.request.params.get('productId')).toBe('product-1');
      req.flush({ status: 200, responseMessage: 'ok', data: details });

      expect(await result).toEqual(details);
    });

    it('errors with the server response for an unknown product', async () => {
      const result = firstValueFrom(service.getProductDetails('missing'));
      httpMock
        .expectOne((r) => r.url === DETAILS_URL)
        .flush(
          { title: 'Error', status: 404, detail: 'Product not found.' },
          { status: 404, statusText: 'Not Found' },
        );

      await expect(result).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('createProduct', () => {
    const buildRequest = (): CreateProductRequest => ({
      name: 'Widget',
      category: 'Gadgets',
      description: null,
      price: 9.99,
      initialQuantity: 10,
      warehouse: 'Cluj',
    });

    it('POSTs the product to the create endpoint', () => {
      service.createProduct(buildRequest()).subscribe();

      const req = httpMock.expectOne(`${API_URL}/create`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(buildRequest());

      req.flush({
        status: 200,
        responseMessage: 'Product created successfully.',
      });
    });

    it('shows a success notification once the request resolves', () => {
      service.createProduct(buildRequest()).subscribe();

      httpMock.expectOne(`${API_URL}/create`).flush({
        status: 200,
        responseMessage: 'Product created successfully.',
      });

      expect(notificationShow).toHaveBeenCalledWith(
        'Product added successfully.',
      );
    });
  });
});

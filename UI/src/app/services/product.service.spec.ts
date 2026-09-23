import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Product } from '../interfaces/product';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  const API_URL = `${environment.apiUrl}/api/customer/products`;

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
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // httpResource issues its request from an effect, so flush effects after
  // calling loadProducts() before expecting the HTTP call.
  const load = () => {
    service.loadProducts();
    TestBed.tick();
  };

  // ...and the response is applied asynchronously, so wait for the app to settle
  // after flushing before asserting on the signals.
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  it('makes no request until loadProducts() is called', () => {
    TestBed.tick();

    httpMock.expectNone(API_URL);
    expect(service.products()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('populates products from a successful response', async () => {
    const product = buildProduct();

    load();
    httpMock
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: [product] });
    await settle();

    expect(service.products()).toEqual([product]);
    expect(service.error()).toBeNull();
  });

  it('re-requests when loadProducts() is called again (stock changes with each purchase)', async () => {
    load();
    httpMock
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: [buildProduct()] });
    await settle();

    load();

    httpMock.expectOne(API_URL).flush({
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
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: [product] });

    expect(result).toEqual([product]);
    expect(service.products()).toEqual([]); // the resource was never loaded
  });

  it('surfaces the server-provided error message when present', async () => {
    load();

    httpMock
      .expectOne(API_URL)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(service.loading()).toBe(false);
    expect(service.error()).toBe('boom');
    expect(service.products()).toEqual([]);
  });
});

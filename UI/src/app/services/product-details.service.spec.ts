import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ProductDetails } from '../interfaces/product-details';
import { ProductDetailsService } from './product-details.service';

describe('ProductDetailsService', () => {
  let service: ProductDetailsService;
  let httpMock: HttpTestingController;

  const API_URL = `${environment.apiUrl}/api/customer/product-details`;

  const buildDetails = (): ProductDetails => ({
    product: {
      productId: 'product-1',
      name: 'Aerobook 14 Pro',
      category: 'Laptop',
      price: 1299,
      initialQuantity: 25,
      quantityOnHand: 24,
      soldQuantity: 1,
      warehouse: 'Central Depot',
    },
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductDetailsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // httpResource issues its request from an effect, so flush effects after loading.
  const load = (productId: string) => {
    service.loadProductDetails(productId);
    TestBed.tick();
  };

  // ...and the response is applied asynchronously, so wait for the app to settle.
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  it('makes no request until a product is loaded', () => {
    TestBed.tick();

    httpMock.expectNone((r) => r.url === API_URL);
    expect(service.detailsSignal()).toBeNull();
    expect(service.loadingSignal()).toBe(false);
  });

  it('sends the productId as a query param and exposes the product and its buyers', async () => {
    const details = buildDetails();

    load('product-1');
    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('productId')).toBe('product-1');
    req.flush({ status: 200, responseMessage: 'ok', data: details });
    await settle();

    expect(service.detailsSignal()).toEqual(details);
    expect(service.errorSignal()).toBeNull();
  });

  it('re-requests when asked to load the same product again', async () => {
    load('product-1');
    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: buildDetails() });
    await settle();

    load('product-1');

    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: buildDetails() });
    await settle();
  });

  it('surfaces the server message for an unknown product', async () => {
    load('missing');

    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush(
        { status: 404, responseMessage: 'Product not found.' },
        { status: 404, statusText: 'Not Found' },
      );
    await settle();

    expect(service.errorSignal()).toBe('Product not found.');
    expect(service.detailsSignal()).toBeNull();
  });
});

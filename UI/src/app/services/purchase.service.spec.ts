import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Purchase } from '../interfaces/purchase';
import { NotificationService } from './notification.service';
import { PurchaseService } from './purchase.service';

describe('PurchaseService', () => {
  let service: PurchaseService;
  let httpMock: HttpTestingController;
  let notificationService: NotificationService;

  const BASE_URL = `${environment.apiUrl}/api/customer`;
  const LIST_URL = `${BASE_URL}/purchases`;
  const PURCHASE_URL = `${BASE_URL}/purchase`;

  const buildPurchase = (overrides: Partial<Purchase> = {}): Purchase => ({
    customerPurchaseId: 1,
    customerId: 'customer-1',
    productId: 'product-1',
    productName: 'Aerobook 14 Pro',
    category: 'Laptop',
    price: 1299,
    purchasedAt: '2026-01-01T10:00:00',
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PurchaseService);
    httpMock = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // httpResource issues its request from an effect, so flush effects after
  // calling loadPurchases() before expecting the HTTP call.
  const load = (customerId: string) => {
    service.loadPurchases(customerId);
    TestBed.tick();
  };

  // ...and the response is applied asynchronously, so wait for the app to settle
  // after flushing before asserting on the signals.
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  describe('loadPurchases', () => {
    it('makes no request until a customer is loaded', () => {
      TestBed.tick();

      httpMock.expectNone((r) => r.url === LIST_URL);
      expect(service.entriesSignal()).toEqual([]);
      expect(service.loadingSignal()).toBe(false);
    });

    it('sends the customerId as a query param and populates entriesSignal', async () => {
      const purchase = buildPurchase();

      load('customer-1');
      const req = httpMock.expectOne((r) => r.url === LIST_URL);
      expect(req.request.params.get('customerId')).toBe('customer-1');
      req.flush({ status: 200, responseMessage: 'ok', data: [purchase] });
      await settle();

      expect(service.entriesSignal()).toEqual([purchase]);
      expect(service.errorSignal()).toBeNull();
    });

    it('re-requests when asked to load the same customer again (e.g. after a purchase)', async () => {
      load('customer-1');
      httpMock
        .expectOne((r) => r.url === LIST_URL)
        .flush({ status: 200, responseMessage: 'ok', data: [] });
      await settle();

      load('customer-1');

      httpMock
        .expectOne((r) => r.url === LIST_URL)
        .flush({ status: 200, responseMessage: 'ok', data: [buildPurchase()] });
      await settle();
      expect(service.entriesSignal()).toHaveLength(1);
    });

    it('surfaces the server-provided error message when present', async () => {
      load('customer-1');

      httpMock
        .expectOne((r) => r.url === LIST_URL)
        .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
      await settle();

      expect(service.errorSignal()).toBe('boom');
      expect(service.entriesSignal()).toEqual([]);
    });
  });

  describe('purchaseProduct', () => {
    it('POSTs the customer and product customerIds as query params', () => {
      service.purchaseProduct('customer-1', 'product-1').subscribe();

      const req = httpMock.expectOne((r) => r.url === PURCHASE_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.params.get('customerId')).toBe('customer-1');
      expect(req.request.params.get('productId')).toBe('product-1');
      req.flush({ status: 200, responseMessage: 'Purchase recorded successfully.' });
    });

    it('shows a success notification once the purchase is recorded', () => {
      const show = vi.spyOn(notificationService, 'show');

      service.purchaseProduct('customer-1', 'product-1').subscribe();
      httpMock
        .expectOne((r) => r.url === PURCHASE_URL)
        .flush({ status: 200, responseMessage: 'ok' });

      expect(show).toHaveBeenCalledWith('Purchase recorded.');
    });

    it('purchaseProductSilently POSTs the same request but shows no notification', () => {
      const show = vi.spyOn(notificationService, 'show');

      service.purchaseProductSilently('customer-1', 'product-1').subscribe();
      const req = httpMock.expectOne((r) => r.url === PURCHASE_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.params.get('customerId')).toBe('customer-1');
      expect(req.request.params.get('productId')).toBe('product-1');
      req.flush({ status: 200, responseMessage: 'ok' });

      expect(show).not.toHaveBeenCalled();
    });

    it('propagates a failure to the caller without a success notification', () => {
      const show = vi.spyOn(notificationService, 'show');
      const onError = vi.fn();

      service.purchaseProduct('customer-1', 'product-1').subscribe({ error: onError });
      httpMock
        .expectOne((r) => r.url === PURCHASE_URL)
        .flush(
          { responseMessage: 'Product is out of stock.' },
          { status: 409, statusText: 'Conflict' },
        );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(show).not.toHaveBeenCalled();
    });
  });
});

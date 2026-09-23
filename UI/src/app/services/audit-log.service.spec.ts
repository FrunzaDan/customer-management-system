import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuditLogEntry } from '../interfaces/audit-log-entry';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let httpMock: HttpTestingController;

  const API_URL = `${environment.apiUrl}/api/customer/audit-log`;

  const buildEntry = (overrides: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
    customerAuditLogId: 1,
    customerId: 'customer-1',
    performedBy: 'TestMerchantID',
    actionType: 'Created',
    details: 'Email: dan@example.com, phone number: 123456789',
    occurredAt: '2026-01-01T10:00:00',
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // httpResource issues its request from an effect, so flush effects after
  // calling loadAuditLog() before expecting the HTTP call.
  const load = (customerId: string) => {
    service.loadAuditLog(customerId);
    TestBed.tick();
  };

  // ...and the response is applied asynchronously, so wait for the app to settle
  // after flushing before asserting on the signals.
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  it('makes no request until a customer is loaded', async () => {
    TestBed.tick();

    httpMock.expectNone((r) => r.url === API_URL);
    expect(service.entriesSignal()).toEqual([]);
    expect(service.loadingSignal()).toBe(false);
  });

  it('sends the customerId as a query param', async () => {
    load('customer-1');

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('customerId')).toBe('customer-1');

    req.flush({ status: 200, responseMessage: 'ok', data: [] });
    await settle();
  });

  it('reports loading while the request is in flight', async () => {
    load('customer-1');

    expect(service.loadingSignal()).toBe(true);

    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: [] });
    await settle();

    expect(service.loadingSignal()).toBe(false);
  });

  it('populates entriesSignal from a successful response and clears any error', async () => {
    const entry = buildEntry();

    load('customer-1');
    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: [entry] });
    await settle();

    expect(service.entriesSignal()).toEqual([entry]);
    expect(service.errorSignal()).toBeNull();
  });

  it('surfaces the server-provided error message when present', async () => {
    load('customer-1');

    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBe('boom');
  });

  it('falls back to a generic message when the error body has no message', async () => {
    load('customer-1');

    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(service.errorSignal()).toBe(
      'Failed to load the audit trail (500). Please try again.',
    );
  });

  it('re-requests when asked to load the same customer again (e.g. after a status change)', async () => {
    load('customer-1');
    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: [] });
    await settle();

    load('customer-1');

    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: [buildEntry()] });
    await settle();
    expect(service.entriesSignal()).toHaveLength(1);
  });

  it('starts a new request for a different customer', async () => {
    load('customer-1');
    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: [] });
    await settle();

    load('customer-2');

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('customerId')).toBe('customer-2');
    req.flush({ status: 200, responseMessage: 'ok', data: [] });
    await settle();
  });
});

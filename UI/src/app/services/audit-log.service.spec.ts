import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AuditLogEntry } from '../interfaces/audit-log-entry';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let httpMock: HttpTestingController;

  const API_URL = `${environment.CustomerManagementSystemAPI}/api/Customer/auditLog`;

  const buildEntry = (overrides: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
    auditId: 1,
    customerGuid: 'guid-1',
    merchantId: 'TestMerchantID',
    action: 'Created',
    details: 'Email: dan@example.com, MSISDN: 123456789',
    actionDate: '2026-01-01T10:00:00',
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

  it('sends the customerGuid as a query param', () => {
    service.loadAuditLog('guid-1');

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('customerGuid')).toBe('guid-1');

    req.flush({ status: 200, responseMessage: 'ok', data: [] });
  });

  it('sets loading true synchronously while the request is in flight', () => {
    service.loadAuditLog('guid-1');

    expect(service.loadingSignal()).toBe(true);

    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: [] });

    expect(service.loadingSignal()).toBe(false);
  });

  it('populates entriesSignal from a successful response and clears any error', () => {
    const entry = buildEntry();

    service.loadAuditLog('guid-1');
    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: [entry] });

    expect(service.entriesSignal()).toEqual([entry]);
    expect(service.errorSignal()).toBeNull();
  });

  it('surfaces the server-provided error message when present', () => {
    service.loadAuditLog('guid-1');

    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBe('boom');
  });

  it('falls back to a generic message when the error body has no message', () => {
    service.loadAuditLog('guid-1');

    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(service.errorSignal()).toBe(
      'Request failed (500). Please try again.',
    );
  });
});

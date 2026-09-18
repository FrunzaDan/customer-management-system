import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { GlobalAuditLogEntry } from '../interfaces/global-audit-log-entry';
import { GlobalAuditLogService } from './global-audit-log.service';

describe('GlobalAuditLogService', () => {
  let service: GlobalAuditLogService;
  let httpMock: HttpTestingController;

  const API_URL = `${environment.CustomerManagementSystemAPI}/api/Customer/auditLog/all`;

  const buildEntry = (
    overrides: Partial<GlobalAuditLogEntry> = {},
  ): GlobalAuditLogEntry => ({
    auditId: 1,
    customerGuid: 'guid-1',
    customerFirstName: 'Dan',
    customerLastName: 'Frunza',
    merchantId: 'TestMerchantID',
    action: 'Created',
    details: '',
    actionDate: '2026-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GlobalAuditLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends pageNumber and pageSize as query params', () => {
    service.loadAllAuditLog({ pageNumber: 2, pageSize: 20 });

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('pageNumber')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('20');

    req.flush({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber: 2, pageSize: 20, totalItems: 0, items: [] },
    });
  });

  it('populates entriesSignal/totalItemsSignal/pageNumberSignal from a successful response', () => {
    const entry = buildEntry();

    service.loadAllAuditLog({ pageNumber: 1, pageSize: 20 });
    httpMock.expectOne((r) => r.url === API_URL).flush({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber: 1, pageSize: 20, totalItems: 1, items: [entry] },
    });

    expect(service.entriesSignal()).toEqual([entry]);
    expect(service.totalItemsSignal()).toBe(1);
    expect(service.pageNumberSignal()).toBe(1);
    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBeNull();
  });

  it('sets loading true synchronously while the request is in flight', () => {
    service.loadAllAuditLog({ pageNumber: 1, pageSize: 20 });

    expect(service.loadingSignal()).toBe(true);

    httpMock.expectOne((r) => r.url === API_URL).flush({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber: 1, pageSize: 20, totalItems: 0, items: [] },
    });

    expect(service.loadingSignal()).toBe(false);
  });

  it('sets a friendly message and clears loading on a network error (status 0)', () => {
    service.loadAllAuditLog({ pageNumber: 1, pageSize: 20 });

    httpMock
      .expectOne((r) => r.url === API_URL)
      .error(new ProgressEvent('error'), { status: 0 });

    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBe(
      'Network error - please check your connection.',
    );
  });
});

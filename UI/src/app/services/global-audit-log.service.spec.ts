import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { GlobalAuditLogEntry } from '../interfaces/global-audit-log-entry';
import { GlobalAuditLogService } from './global-audit-log.service';
import { NotificationService } from './notification.service';

describe('GlobalAuditLogService', () => {
  let service: GlobalAuditLogService;
  let httpMock: HttpTestingController;

  const API_URL = `${environment.apiUrl}/api/customer/audit-log/all`;

  const buildEntry = (
    overrides: Partial<GlobalAuditLogEntry> = {},
  ): GlobalAuditLogEntry => ({
    customerAuditLogId: 1,
    customerId: 'customer-1',
    customerFirstName: 'Dan',
    customerLastName: 'Frunza',
    performedBy: 'TestMerchantID',
    actionType: 'Created',
    details: '',
    occurredAt: '2026-01-01T00:00:00Z',
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
      'Could not reach the server. It may be offline, or your browser does not trust its security certificate.',
    );
  });

  it('drops a stale response when a newer page is requested before it arrives', () => {
    const newer = buildEntry({ customerAuditLogId: 2 });

    service.loadAllAuditLog({ pageNumber: 1, pageSize: 20 });
    service.loadAllAuditLog({ pageNumber: 2, pageSize: 20 });

    const [stale, current] = httpMock.match((r) => r.url === API_URL);
    expect(stale.cancelled).toBe(true);
    current.flush({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber: 2, pageSize: 20, totalItems: 21, items: [newer] },
    });

    expect(service.pageNumberSignal()).toBe(2);
    expect(service.entriesSignal()).toEqual([newer]);
  });

  it('empties the list and shows a toast once the log is cleared', () => {
    const show = vi.spyOn(TestBed.inject(NotificationService), 'show');
    service.loadAllAuditLog({ pageNumber: 2, pageSize: 20 });
    httpMock.expectOne((r) => r.url === API_URL).flush({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber: 2, pageSize: 20, totalItems: 21, items: [buildEntry()] },
    });

    service.deleteAllAuditLog().subscribe();
    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: 200, responseMessage: 'Audit log cleared successfully.' });

    expect(service.entriesSignal()).toEqual([]);
    expect(service.totalItemsSignal()).toBe(0);
    expect(service.pageNumberSignal()).toBe(1);
    expect(show).toHaveBeenCalledWith('Audit log cleared successfully.');
  });
});

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
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

  // The response is applied asynchronously, so wait for the app to settle
  // after flushing before asserting on the signals.
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  // httpResource issues its request from an effect, so flush effects after
  // calling loadAllAuditLog() before expecting the HTTP call.
  const load = (pageNumber: number, pageSize = 20) => {
    service.loadAllAuditLog({ pageNumber, pageSize });
    TestBed.tick();
  };

  const pageOf = (
    items: GlobalAuditLogEntry[],
    pageNumber = 1,
    totalItems = items.length,
  ) => ({
    status: 200,
    responseMessage: 'ok',
    data: { pageNumber, pageSize: 20, totalItems, items },
  });

  it('makes no request until loadAllAuditLog() is called', () => {
    TestBed.tick();

    httpMock.expectNone((r) => r.url === API_URL);
    expect(service.entries()).toEqual([]);
    expect(service.loading()).toBe(false);
  });

  it('sends pageNumber and pageSize as query params', () => {
    load(2);

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('pageNumber')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('20');

    req.flush(pageOf([], 2));
  });

  it('populates entries/totalItems/pageNumber from a successful response', async () => {
    const entry = buildEntry();

    load(1);
    httpMock.expectOne((r) => r.url === API_URL).flush(pageOf([entry]));
    await settle();

    expect(service.entries()).toEqual([entry]);
    expect(service.totalItems()).toBe(1);
    expect(service.pageNumber()).toBe(1);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('sets loading true synchronously while the request is in flight', async () => {
    load(1);

    expect(service.loading()).toBe(true);

    httpMock.expectOne((r) => r.url === API_URL).flush(pageOf([]));
    await settle();

    expect(service.loading()).toBe(false);
  });

  it('sets a friendly message and clears loading on a network error (status 0)', async () => {
    load(1);

    httpMock
      .expectOne((r) => r.url === API_URL)
      .error(new ProgressEvent('error'), { status: 0 });
    await settle();

    expect(service.loading()).toBe(false);
    expect(service.error()).toBe(
      'Could not reach the server. It may be offline, or your browser may not trust its security certificate.',
    );
  });

  it('cancels a stale request when a newer page is requested before it arrives', async () => {
    const newer = buildEntry({ customerAuditLogId: 2 });

    load(1);
    const stale = httpMock.expectOne((r) => r.url === API_URL);
    load(2);

    expect(stale.cancelled).toBe(true);
    httpMock.expectOne((r) => r.url === API_URL).flush(pageOf([newer], 2, 21));
    await settle();

    expect(service.pageNumber()).toBe(2);
    expect(service.entries()).toEqual([newer]);
  });

  it('empties the list and shows a toast once the log is cleared', async () => {
    const show = vi.spyOn(TestBed.inject(NotificationService), 'show');
    load(2);
    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush(pageOf([buildEntry()], 2, 21));
    await settle();

    service.deleteAllAuditLog().subscribe();
    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.method).toBe('DELETE');
    req.flush({
      status: 200,
      responseMessage: 'Audit log cleared successfully.',
    });

    expect(service.entries()).toEqual([]);
    expect(service.totalItems()).toBe(0);
    expect(service.pageNumber()).toBe(1);
    expect(show).toHaveBeenCalledWith('Audit log cleared successfully.');
  });
});

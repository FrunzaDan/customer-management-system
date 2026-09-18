import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ExportCustomerService } from './export-customer.service';

describe('ExportCustomerService', () => {
  let service: ExportCustomerService;
  let httpMock: HttpTestingController;
  let triggerDownloadSpy: ReturnType<typeof vi.fn>;

  const API_URL = `${environment.CustomerManagementSystemAPI}/api/Customer/export`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExportCustomerService);
    httpMock = TestBed.inject(HttpTestingController);

    // triggerDownload drives browser-only APIs (URL.createObjectURL, an <a>
    // click) that jsdom doesn't implement — stub it (via an `any` cast, since
    // it's private) so tests can assert the HTTP/signal behavior without
    // exercising that DOM plumbing.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggerDownloadSpy = vi
      .spyOn(service as any, 'triggerDownload')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends sortColumn and sortDirection as query params, defaulting when not provided', () => {
    service.exportCustomers({});

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('sortColumn')).toBe('name');
    expect(req.request.params.get('sortDirection')).toBe('asc');
    expect(req.request.params.has('searchTerm')).toBe(false);
    expect(req.request.responseType).toBe('blob');

    req.flush(new Blob(['csv content']));
  });

  it('includes searchTerm only when a non-empty one is provided', () => {
    service.exportCustomers({ searchTerm: 'dan', sortColumn: 'email', sortDirection: 'desc' });

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('searchTerm')).toBe('dan');
    expect(req.request.params.get('sortColumn')).toBe('email');
    expect(req.request.params.get('sortDirection')).toBe('desc');

    req.flush(new Blob(['csv content']));
  });

  it('sets loading true synchronously while the request is in flight, then false on success', () => {
    service.exportCustomers({});

    expect(service.loadingSignal()).toBe(true);

    httpMock.expectOne((r) => r.url === API_URL).flush(new Blob(['csv content']));

    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBeNull();
  });

  it('triggers a download with the received blob on success', () => {
    service.exportCustomers({});

    const blob = new Blob(['csv content']);
    httpMock.expectOne((r) => r.url === API_URL).flush(blob);

    expect(triggerDownloadSpy).toHaveBeenCalledWith(
      blob,
      expect.stringMatching(/^customers_.*\.csv$/),
    );
  });

  it('sets a friendly message and clears loading on a network error (status 0)', () => {
    service.exportCustomers({});

    httpMock
      .expectOne((r) => r.url === API_URL)
      .error(new ProgressEvent('error'), { status: 0 });

    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBe(
      'Network error - please check your connection.',
    );
  });

  it('sets a generic message on a server error (status 500)', () => {
    service.exportCustomers({});

    httpMock
      .expectOne((r) => r.url === API_URL)
      .flush(new Blob(['error']), { status: 500, statusText: 'Server Error' });

    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBe('Server error - please try again later.');
  });
});

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Customer } from '../interfaces/customer-response';
import { GetCustomerService } from './get-customer.service';

describe('GetCustomerService', () => {
  let service: GetCustomerService;
  let httpMock: HttpTestingController;

  const API_URL = `${environment.CustomerManagementSystemAPI}/api/Customer/all`;

  const buildCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    guid: 'guid-1',
    firstName: 'Dan',
    lastName: 'Frunza',
    msisdn: '123456789',
    email: 'dan@example.com',
    gender: 1,
    customerStatus: 1901,
    creationDate: '2026-01-01',
    interactionDate: '2026-01-01',
    birthdate: '1990-01-01',
    address: {
      country: 'Romania',
      county: 'Cluj',
      town: 'Cluj-Napoca',
      zip: '400000',
      street: 'Main',
      number: '1',
    },
    ...overrides,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GetCustomerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends pageNumber, pageSize, sortColumn, and sortDirection as query params', () => {
    service.loadCustomers({
      pageNumber: 2,
      pageSize: 10,
      sortColumn: 'email',
      sortDirection: 'desc',
    });

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('pageNumber')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('10');
    expect(req.request.params.get('sortColumn')).toBe('email');
    expect(req.request.params.get('sortDirection')).toBe('desc');
    expect(req.request.params.has('searchTerm')).toBe(false);

    req.flush({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber: 2, pageSize: 10, totalItems: 0, items: [] },
    });
  });

  it('defaults sortColumn to name and sortDirection to asc when not provided', () => {
    service.loadCustomers({ pageNumber: 1, pageSize: 10 });

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('sortColumn')).toBe('name');
    expect(req.request.params.get('sortDirection')).toBe('asc');

    req.flush({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber: 1, pageSize: 10, totalItems: 0, items: [] },
    });
  });

  it('includes searchTerm only when a non-empty one is provided', () => {
    service.loadCustomers({ pageNumber: 1, pageSize: 10, searchTerm: 'dan' });

    const req = httpMock.expectOne((r) => r.url === API_URL);
    expect(req.request.params.get('searchTerm')).toBe('dan');

    req.flush({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber: 1, pageSize: 10, totalItems: 0, items: [] },
    });
  });

  it('populates customersSignal/totalItemsSignal/pageNumberSignal/pageSizeSignal from a successful response', () => {
    const customer = buildCustomer();

    service.loadCustomers({ pageNumber: 1, pageSize: 10 });
    httpMock.expectOne((r) => r.url === API_URL).flush({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber: 1, pageSize: 10, totalItems: 1, items: [customer] },
    });

    expect(service.customersSignal()).toEqual([customer]);
    expect(service.totalItemsSignal()).toBe(1);
    expect(service.pageNumberSignal()).toBe(1);
    expect(service.pageSizeSignal()).toBe(10);
    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBeNull();
  });

  it('sets loading true synchronously while the request is in flight', () => {
    service.loadCustomers({ pageNumber: 1, pageSize: 10 });

    expect(service.loadingSignal()).toBe(true);

    httpMock.expectOne((r) => r.url === API_URL).flush({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber: 1, pageSize: 10, totalItems: 0, items: [] },
    });

    expect(service.loadingSignal()).toBe(false);
  });

  it('sets a friendly message and clears loading on a network error (status 0)', () => {
    service.loadCustomers({ pageNumber: 1, pageSize: 10 });

    httpMock
      .expectOne((r) => r.url === API_URL)
      .error(new ProgressEvent('error'), { status: 0 });

    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBe(
      'Network error - please check your connection.',
    );
  });

  it('updateCustomerLocally replaces a matching customer in customersSignal', () => {
    const original = buildCustomer();

    service.loadCustomers({ pageNumber: 1, pageSize: 10 });
    httpMock.expectOne((r) => r.url === API_URL).flush({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber: 1, pageSize: 10, totalItems: 1, items: [original] },
    });

    const updated = { ...original, firstName: 'Updated' };
    service.updateCustomerLocally(updated);

    expect(service.customersSignal()).toEqual([updated]);
  });

  it('removeCustomerLocally drops a matching customer from customersSignal', () => {
    const customer = buildCustomer();

    service.loadCustomers({ pageNumber: 1, pageSize: 10 });
    httpMock.expectOne((r) => r.url === API_URL).flush({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber: 1, pageSize: 10, totalItems: 1, items: [customer] },
    });

    service.removeCustomerLocally(customer.guid);

    expect(service.customersSignal()).toEqual([]);
  });
});

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateCustomerRequest,
  Customer,
  CustomerStatus,
  Gender,
} from '../interfaces/customer';
import { CustomerService } from './customer.service';
import { NotificationService } from './notification.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let httpMock: HttpTestingController;
  let notificationShow: ReturnType<typeof vi.fn>;

  const API_URL = `${environment.apiUrl}/api/customer`;

  const buildCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    customerId: 'customer-1',
    firstName: 'Dan',
    lastName: 'Frunza',
    phoneNumber: '123456789',
    email: 'dan@example.com',
    gender: Gender.Male,
    status: CustomerStatus.Active,
    createdAt: '2026-01-01',
    lastInteractionAt: '2026-01-01',
    birthDate: '1990-01-01',
    address: {
      country: 'Romania',
      county: 'Cluj',
      city: 'Cluj-Napoca',
      postalCode: '400000',
      street: 'Main',
      streetNumber: '1',
    },
    ...overrides,
  });

  // The response is applied asynchronously, so wait for the app to settle
  // after flushing before asserting on the signals.
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  // httpResource issues its request from an effect, so flush effects after
  // calling loadCustomers() before expecting the HTTP call.
  const load = (params: Parameters<CustomerService['loadCustomers']>[0]) => {
    service.loadCustomers(params);
    TestBed.tick();
  };

  // Loads one page holding `customers`, the way the list page fills the service.
  const seedCustomers = async (customers: Customer[]) => {
    load({ pageNumber: 1, pageSize: 10 });
    httpMock
      .expectOne((r) => r.url === `${API_URL}/all`)
      .flush({
        status: 200,
        responseMessage: 'ok',
        data: {
          pageNumber: 1,
          pageSize: 10,
          totalItems: customers.length,
          items: customers,
        },
      });
    await settle();
  };

  beforeEach(() => {
    notificationShow = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: { show: notificationShow } },
      ],
    });
    service = TestBed.inject(CustomerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('loadCustomers', () => {
    const emptyPage = (pageNumber: number) => ({
      status: 200,
      responseMessage: 'ok',
      data: { pageNumber, pageSize: 10, totalItems: 0, items: [] },
    });

    it('sends pageNumber, pageSize, sortColumn, and sortDirection as query params', () => {
      load({
        pageNumber: 2,
        pageSize: 10,
        sortColumn: 'email',
        sortDirection: 'desc',
      });

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/all`);
      expect(req.request.params.get('pageNumber')).toBe('2');
      expect(req.request.params.get('pageSize')).toBe('10');
      expect(req.request.params.get('sortColumn')).toBe('email');
      expect(req.request.params.get('sortDirection')).toBe('desc');
      expect(req.request.params.has('searchTerm')).toBe(false);

      req.flush(emptyPage(2));
    });

    it('defaults sortColumn to name and sortDirection to asc when not provided', () => {
      load({ pageNumber: 1, pageSize: 10 });

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/all`);
      expect(req.request.params.get('sortColumn')).toBe('name');
      expect(req.request.params.get('sortDirection')).toBe('asc');

      req.flush(emptyPage(1));
    });

    it('includes searchTerm only when a non-empty one is provided', () => {
      load({ pageNumber: 1, pageSize: 10, searchTerm: 'dan' });

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/all`);
      expect(req.request.params.get('searchTerm')).toBe('dan');

      req.flush(emptyPage(1));
    });

    it('populates customers/totalItems/pageNumber/pageSize from a successful response', async () => {
      const customer = buildCustomer();

      await seedCustomers([customer]);

      expect(service.customers()).toEqual([customer]);
      expect(service.totalItems()).toBe(1);
      expect(service.pageNumber()).toBe(1);
      expect(service.pageSize()).toBe(10);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('sets loading true synchronously while the request is in flight', async () => {
      load({ pageNumber: 1, pageSize: 10 });

      expect(service.loading()).toBe(true);

      httpMock.expectOne((r) => r.url === `${API_URL}/all`).flush(emptyPage(1));
      await settle();

      expect(service.loading()).toBe(false);
    });

    it('sets a friendly message and clears loading on a network error (status 0)', async () => {
      load({ pageNumber: 1, pageSize: 10 });

      httpMock
        .expectOne((r) => r.url === `${API_URL}/all`)
        .error(new ProgressEvent('error'), { status: 0 });
      await settle();

      expect(service.loading()).toBe(false);
      expect(service.error()).toBe(
        'Could not reach the server. It may be offline, or your browser may not trust its security certificate.',
      );
    });
  });

  describe('loadCustomers (resource behaviour)', () => {
    const pageOf = (customers: Customer[], pageNumber = 1) => ({
      status: 200,
      responseMessage: 'ok',
      data: {
        pageNumber,
        pageSize: 10,
        totalItems: customers.length,
        items: customers,
      },
    });

    it('makes no request until loadCustomers() is called', () => {
      TestBed.tick();

      httpMock.expectNone((r) => r.url === `${API_URL}/all`);
      expect(service.customers()).toEqual([]);
      expect(service.loading()).toBe(false);
    });

    it('keeps the loaded page on screen while the next page loads', async () => {
      const first = buildCustomer();
      await seedCustomers([first]);
      // Read it, as the list page's template does.
      expect(service.customers()).toEqual([first]);

      load({ pageNumber: 2, pageSize: 10 });

      expect(service.loading()).toBe(true);
      expect(service.customers()).toEqual([first]);

      const second = buildCustomer({ customerId: 'customer-2' });
      httpMock
        .expectOne((r) => r.url === `${API_URL}/all`)
        .flush(pageOf([second], 2));
      await settle();

      expect(service.customers()).toEqual([second]);
      expect(service.pageNumber()).toBe(2);
    });

    it('cancels the request still in flight when a newer page is requested', async () => {
      load({ pageNumber: 1, pageSize: 10 });
      const stale = httpMock.expectOne((r) => r.url === `${API_URL}/all`);

      load({ pageNumber: 2, pageSize: 10 });

      expect(stale.cancelled).toBe(true);
      httpMock
        .expectOne((r) => r.url === `${API_URL}/all`)
        .flush(pageOf([], 2));
      await settle();
      expect(service.pageNumber()).toBe(2);
    });

    it('fetches the same page again when asked with the same params', async () => {
      await seedCustomers([buildCustomer()]);

      load({ pageNumber: 1, pageSize: 10 });

      httpMock.expectOne((r) => r.url === `${API_URL}/all`).flush(pageOf([]));
      await settle();
      expect(service.customers()).toEqual([]);
    });
  });

  describe('getCustomer', () => {
    it('GETs one customer by id and emits it', async () => {
      const customer = buildCustomer();

      const result = firstValueFrom(service.getCustomer(customer.customerId));
      const req = httpMock.expectOne((r) => r.url === `${API_URL}/get`);
      expect(req.request.params.get('searchTerm')).toBe(customer.customerId);
      req.flush({ status: 200, responseMessage: 'ok', data: customer });

      expect(await result).toEqual(customer);
    });

    it('errors when the response carries no customer', async () => {
      const result = firstValueFrom(service.getCustomer('customer-1'));
      httpMock
        .expectOne((r) => r.url === `${API_URL}/get`)
        .flush({ status: 200, responseMessage: 'ok', data: null });

      await expect(result).rejects.toThrow('Customer not found.');
    });
  });

  describe('createCustomer', () => {
    const buildRequest = (): CreateCustomerRequest => ({
      firstName: 'Dan',
      lastName: 'Frunza',
      phoneNumber: '123456789',
      email: 'dan@example.com',
      gender: Gender.Male,
      birthDate: '1990-01-01',
      address: {
        country: 'Romania',
        county: 'Cluj',
        city: 'Cluj-Napoca',
        postalCode: '400000',
        street: 'Main',
        streetNumber: '1',
      },
    });

    it('POSTs the customer to the create endpoint', () => {
      service.createCustomer(buildRequest()).subscribe();

      const req = httpMock.expectOne(`${API_URL}/create`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(buildRequest());

      req.flush({
        status: 200,
        responseMessage: 'Customer created successfully.',
      });
    });

    it('shows a success notification once the request resolves', () => {
      service.createCustomer(buildRequest()).subscribe();

      httpMock.expectOne(`${API_URL}/create`).flush({
        status: 200,
        responseMessage: 'Customer created successfully.',
      });

      expect(notificationShow).toHaveBeenCalledWith(
        'Customer added successfully.',
      );
    });

    it('createCustomerSilently POSTs to the same endpoint without showing a notification', () => {
      service.createCustomerSilently(buildRequest()).subscribe();

      const req = httpMock.expectOne(`${API_URL}/create`);
      expect(req.request.method).toBe('POST');
      req.flush({
        status: 200,
        responseMessage: 'Customer created successfully.',
      });

      expect(notificationShow).not.toHaveBeenCalled();
    });
  });

  describe('updateCustomer', () => {
    it('PATCHes only the editable fields to the update endpoint', () => {
      const customer = buildCustomer();
      service.updateCustomer(customer).subscribe();

      const req = httpMock.expectOne(`${API_URL}/update`);
      expect(req.request.method).toBe('PATCH');
      // Server-owned fields (status, dates) aren't part of an edit request.
      const { status, createdAt, lastInteractionAt, ...editable } = customer;
      expect(req.request.body).toEqual(editable);

      req.flush({
        status: 200,
        responseMessage: 'Customer updated successfully.',
      });
    });

    it('updates the customer in the loaded list and notifies on success', async () => {
      await seedCustomers([buildCustomer()]);
      const updated = buildCustomer({ firstName: 'Updated' });

      service.updateCustomer(updated).subscribe();
      httpMock.expectOne(`${API_URL}/update`).flush({
        status: 200,
        responseMessage: 'Customer updated successfully.',
      });

      expect(service.customers()).toEqual([updated]);
      expect(notificationShow).toHaveBeenCalledWith(
        'Customer updated successfully.',
      );
    });

    it('does not touch the loaded list or notify when the request errors', async () => {
      const original = buildCustomer();
      await seedCustomers([original]);

      service
        .updateCustomer(buildCustomer({ firstName: 'Updated' }))
        .subscribe({ error: () => {} });
      httpMock
        .expectOne(`${API_URL}/update`)
        .flush(
          { title: 'Bad Request', status: 400, detail: 'boom' },
          { status: 400, statusText: 'Bad Request' },
        );

      expect(service.customers()).toEqual([original]);
      expect(notificationShow).not.toHaveBeenCalled();
    });
  });

  describe('deleteCustomer', () => {
    it('DELETEs with the customerId as a query param', () => {
      service.deleteCustomer('customer-1').subscribe();

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/delete`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.params.get('customerId')).toBe('customer-1');

      req.flush({
        status: 200,
        responseMessage: 'Customer deleted successfully.',
      });
    });

    it('removes the customer from the loaded list and notifies on success', async () => {
      await seedCustomers([buildCustomer()]);

      service.deleteCustomer('customer-1').subscribe();
      httpMock
        .expectOne((r) => r.url === `${API_URL}/delete`)
        .flush({
          status: 200,
          responseMessage: 'Customer deleted successfully.',
        });

      expect(service.customers()).toEqual([]);
      expect(notificationShow).toHaveBeenCalledWith(
        'Customer deleted successfully.',
      );
    });

    it('does not touch the loaded list or notify when the request errors', async () => {
      await seedCustomers([buildCustomer()]);

      service.deleteCustomer('customer-1').subscribe({ error: () => {} });
      httpMock
        .expectOne((r) => r.url === `${API_URL}/delete`)
        .flush(
          {
            title: 'Conflict',
            status: 409,
            detail: 'Customer must be deactivated before it can be deleted.',
          },
          { status: 409, statusText: 'Conflict' },
        );

      expect(service.customers()).toHaveLength(1);
      expect(notificationShow).not.toHaveBeenCalled();
    });

    it('deleteCustomerSilently removes the customer from the loaded list, but never notifies', async () => {
      await seedCustomers([buildCustomer()]);

      service.deleteCustomerSilently('customer-1').subscribe();
      const req = httpMock.expectOne((r) => r.url === `${API_URL}/delete`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.params.get('customerId')).toBe('customer-1');
      req.flush({
        status: 200,
        responseMessage: 'Customer deleted successfully.',
      });

      expect(service.customers()).toEqual([]);
      expect(notificationShow).not.toHaveBeenCalled();
    });
  });

  describe('deactivateCustomer / reactivateCustomer', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('sets activationLoading true synchronously while deactivation is in flight', () => {
      service.deactivateCustomer('customer-1');

      expect(service.activationLoading()).toBe(true);

      httpMock
        .expectOne((r) => r.url === `${API_URL}/deactivate`)
        .flush({ status: 200, responseMessage: 'ok' });
    });

    it('deactivateCustomer marks the loaded customer Deactivated and notifies on success', async () => {
      await seedCustomers([buildCustomer()]);

      service.deactivateCustomer('customer-1');
      const req = httpMock.expectOne((r) => r.url === `${API_URL}/deactivate`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.params.get('customerId')).toBe('customer-1');
      req.flush({ status: 200, responseMessage: 'ok' });

      expect(service.customers()[0].status).toBe(CustomerStatus.Deactivated);
      expect(notificationShow).toHaveBeenCalledWith(
        'Customer deactivated successfully.',
      );
      expect(service.activationLoading()).toBe(false);
      expect(service.activationError()).toBeNull();
    });

    it('reactivateCustomer marks the loaded customer Active and hits the reactivate endpoint', async () => {
      await seedCustomers([
        buildCustomer({ status: CustomerStatus.Deactivated }),
      ]);

      service.reactivateCustomer('customer-1');
      const req = httpMock.expectOne((r) => r.url === `${API_URL}/reactivate`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ status: 200, responseMessage: 'ok' });

      expect(service.customers()[0].status).toBe(CustomerStatus.Active);
      expect(notificationShow).toHaveBeenCalledWith(
        'Customer reactivated successfully.',
      );
    });

    it('succeeds and notifies even when the customer is not in the loaded list (e.g. from the details page)', () => {
      service.deactivateCustomer('missing-customerId');
      httpMock
        .expectOne((r) => r.url === `${API_URL}/deactivate`)
        .flush({ status: 200, responseMessage: 'ok' });

      expect(notificationShow).toHaveBeenCalled();
      expect(service.activationError()).toBeNull();
    });

    it('does not retry a definitive 4xx error and surfaces the server message', () => {
      service.deactivateCustomer('customer-1');

      httpMock
        .expectOne((r) => r.url === `${API_URL}/deactivate`)
        .flush(
          {
            title: 'Conflict',
            status: 409,
            detail: 'Customer is already deactivated.',
          },
          { status: 409, statusText: 'Conflict' },
        );

      expect(service.activationLoading()).toBe(false);
      expect(service.activationError()).toBe(
        'Customer is already deactivated.',
      );
      // httpMock.verify() in afterEach confirms no retry request was made.
    });

    it('retries once on a transient (5xx) failure and then succeeds', async () => {
      await seedCustomers([buildCustomer()]);
      vi.useFakeTimers();

      service.deactivateCustomer('customer-1');

      httpMock
        .expectOne((r) => r.url === `${API_URL}/deactivate`)
        .flush(null, { status: 500, statusText: 'Server Error' });

      vi.advanceTimersByTime(500);

      httpMock
        .expectOne((r) => r.url === `${API_URL}/deactivate`)
        .flush({ status: 200, responseMessage: 'ok' });

      expect(service.customers()[0].status).toBe(CustomerStatus.Deactivated);
      expect(service.activationLoading()).toBe(false);
      expect(service.activationError()).toBeNull();
    });
  });

  describe('exportCustomers', () => {
    let triggerDownloadSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // triggerDownload drives browser-only APIs (URL.createObjectURL, an <a>
      // click) that jsdom doesn't implement — stub it (via an `any` cast, since
      // it's private) so tests can assert the HTTP/signal behavior without
      // exercising that DOM plumbing.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      triggerDownloadSpy = vi
        .spyOn(service as any, 'triggerDownload')
        .mockImplementation(() => {});
    });

    it('sends sortColumn and sortDirection as query params, defaulting when not provided', () => {
      service.exportCustomers({});

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/export`);
      expect(req.request.params.get('sortColumn')).toBe('name');
      expect(req.request.params.get('sortDirection')).toBe('asc');
      expect(req.request.params.has('searchTerm')).toBe(false);
      expect(req.request.responseType).toBe('blob');

      req.flush(new Blob(['csv content']));
    });

    it('includes searchTerm only when a non-empty one is provided', () => {
      service.exportCustomers({
        searchTerm: 'dan',
        sortColumn: 'email',
        sortDirection: 'desc',
      });

      const req = httpMock.expectOne((r) => r.url === `${API_URL}/export`);
      expect(req.request.params.get('searchTerm')).toBe('dan');
      expect(req.request.params.get('sortColumn')).toBe('email');
      expect(req.request.params.get('sortDirection')).toBe('desc');

      req.flush(new Blob(['csv content']));
    });

    it('sets exportLoading true synchronously while the request is in flight, then false on success', () => {
      service.exportCustomers({});

      expect(service.exportLoading()).toBe(true);

      httpMock
        .expectOne((r) => r.url === `${API_URL}/export`)
        .flush(new Blob(['csv content']));

      expect(service.exportLoading()).toBe(false);
      expect(service.exportError()).toBeNull();
    });

    it('triggers a download with the received blob on success', () => {
      service.exportCustomers({});

      const blob = new Blob(['csv content']);
      httpMock.expectOne((r) => r.url === `${API_URL}/export`).flush(blob);

      expect(triggerDownloadSpy).toHaveBeenCalledWith(
        blob,
        expect.stringMatching(/^customers_.*\.csv$/),
      );
    });

    it('sets a friendly message and clears exportLoading on a network error (status 0)', () => {
      service.exportCustomers({});

      httpMock
        .expectOne((r) => r.url === `${API_URL}/export`)
        .error(new ProgressEvent('error'), { status: 0 });

      expect(service.exportLoading()).toBe(false);
      expect(service.exportError()).toBe(
        'Could not reach the server. It may be offline, or your browser may not trust its security certificate.',
      );
    });

    it('names the failed export on a server error (status 500)', () => {
      service.exportCustomers({});

      httpMock
        .expectOne((r) => r.url === `${API_URL}/export`)
        .flush(new Blob(['error']), {
          status: 500,
          statusText: 'Server Error',
        });

      expect(service.exportLoading()).toBe(false);
      expect(service.exportError()).toBe(
        'Failed to export customers (500). Please try again.',
      );
    });
  });
});

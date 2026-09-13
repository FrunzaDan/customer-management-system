import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Customer, CustomerActivationStatus } from '../interfaces/customer-response';
import { ActivateCustomerService } from './activate-customer.service';
import { GetCustomerService } from './get-customer.service';
import { HttpHeaderService } from './http-header-service';
import { NotificationService } from './notification.service';

describe('ActivateCustomerService', () => {
  let service: ActivateCustomerService;
  let httpMock: HttpTestingController;
  let customersSignal: ReturnType<typeof signal<Customer[]>>;
  let updateCustomerLocally: ReturnType<typeof vi.fn>;
  let notificationShow: ReturnType<typeof vi.fn>;

  const DEACTIVATE_URL =
    environment.CustomerManagementSystemAPI + '/api/Customer/deactivate';
  const REACTIVATE_URL =
    environment.CustomerManagementSystemAPI + '/api/Customer/reactivate';

  const buildCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    guid: 'guid-1',
    firstName: 'Dan',
    lastName: 'Frunza',
    msisdn: '123456789',
    email: 'dan@example.com',
    gender: 1,
    customerStatus: CustomerActivationStatus.Active,
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
    updateCustomerLocally = vi.fn();
    notificationShow = vi.fn();
    customersSignal = signal<Customer[]>([buildCustomer()]);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: HttpHeaderService,
          useValue: { getHeadersWithTokenSet: () => ({}) },
        },
        {
          provide: GetCustomerService,
          useValue: { customersSignal, updateCustomerLocally },
        },
        { provide: NotificationService, useValue: { show: notificationShow } },
      ],
    });
    service = TestBed.inject(ActivateCustomerService);
    httpMock = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('sets loadingSignal true synchronously while deactivation is in flight', () => {
    service.deactivateCustomer('guid-1');

    expect(service.loadingSignal()).toBe(true);

    httpMock
      .expectOne((r) => r.url === DEACTIVATE_URL)
      .flush({ status: 200, responseMessage: 'ok' });
  });

  it('deactivateCustomer marks the local customer Deactivated and notifies on success', () => {
    service.deactivateCustomer('guid-1');

    const req = httpMock.expectOne((r) => r.url === DEACTIVATE_URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.params.get('customerGUID')).toBe('guid-1');
    req.flush({ status: 200, responseMessage: 'ok' });

    expect(updateCustomerLocally).toHaveBeenCalledWith(
      expect.objectContaining({
        guid: 'guid-1',
        customerStatus: CustomerActivationStatus.Deactivated,
      }),
    );
    expect(notificationShow).toHaveBeenCalledWith(
      'Customer deactivated successfully.',
    );
    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBeNull();
  });

  it('reactivateCustomer marks the local customer Active and hits the reactivate endpoint', () => {
    customersSignal.set([buildCustomer({ customerStatus: CustomerActivationStatus.Deactivated })]);

    service.reactivateCustomer('guid-1');

    const req = httpMock.expectOne((r) => r.url === REACTIVATE_URL);
    expect(req.request.method).toBe('PATCH');
    req.flush({ status: 200, responseMessage: 'ok' });

    expect(updateCustomerLocally).toHaveBeenCalledWith(
      expect.objectContaining({
        guid: 'guid-1',
        customerStatus: CustomerActivationStatus.Active,
      }),
    );
    expect(notificationShow).toHaveBeenCalledWith(
      'Customer reactivated successfully.',
    );
  });

  it('sets an error and skips the local update/notification when the response status is not 200', () => {
    service.deactivateCustomer('guid-1');

    httpMock
      .expectOne((r) => r.url === DEACTIVATE_URL)
      .flush({ status: 409, responseMessage: 'Customer is already deactivated.' });

    expect(updateCustomerLocally).not.toHaveBeenCalled();
    expect(notificationShow).not.toHaveBeenCalled();
    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBe('Deactivation failed');
  });

  it('sets a not-found error and skips notification when the customer is not in the local cache', () => {
    customersSignal.set([]);

    service.deactivateCustomer('missing-guid');

    httpMock
      .expectOne((r) => r.url === DEACTIVATE_URL)
      .flush({ status: 200, responseMessage: 'ok' });

    expect(updateCustomerLocally).not.toHaveBeenCalled();
    expect(notificationShow).not.toHaveBeenCalled();
    expect(service.errorSignal()).toContain('not found locally');
  });

  it('does not retry a definitive 4xx error and surfaces the server message', () => {
    service.deactivateCustomer('guid-1');

    httpMock
      .expectOne((r) => r.url === DEACTIVATE_URL)
      .flush(
        { message: 'Customer is already deactivated.' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBe('Customer is already deactivated.');
    // httpMock.verify() in afterEach confirms no retry request was made.
  });

  it('retries once on a transient (5xx) failure and then succeeds', () => {
    vi.useFakeTimers();

    service.deactivateCustomer('guid-1');

    const firstAttempt = httpMock.expectOne((r) => r.url === DEACTIVATE_URL);
    firstAttempt.flush(null, { status: 500, statusText: 'Server Error' });

    vi.advanceTimersByTime(500);

    const secondAttempt = httpMock.expectOne((r) => r.url === DEACTIVATE_URL);
    secondAttempt.flush({ status: 200, responseMessage: 'ok' });

    expect(updateCustomerLocally).toHaveBeenCalledWith(
      expect.objectContaining({ customerStatus: CustomerActivationStatus.Deactivated }),
    );
    expect(service.loadingSignal()).toBe(false);
    expect(service.errorSignal()).toBeNull();
  });
});

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Customer } from '../interfaces/customer-response';
import { EditCustomerService } from './edit-customer.service';
import { GetCustomerService } from './get-customer.service';
import { HttpHeaderService } from './http-header-service';
import { NotificationService } from './notification.service';

describe('EditCustomerService', () => {
  let service: EditCustomerService;
  let httpMock: HttpTestingController;
  let updateCustomerLocally: ReturnType<typeof vi.fn>;
  let notificationShow: ReturnType<typeof vi.fn>;

  const API_URL = `${environment.apiUrl}/api/customer/edit`;

  const buildCustomer = (): Customer => ({
    customerId: 'customer-1',
    firstName: 'Dan',
    lastName: 'Frunza',
    phoneNumber: '123456789',
    email: 'dan@example.com',
    gender: 1,
    status: 1901,
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
  });

  beforeEach(() => {
    updateCustomerLocally = vi.fn();
    notificationShow = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: HttpHeaderService,
          useValue: { getHeadersWithTokenSet: () => ({}) },
        },
        { provide: GetCustomerService, useValue: { updateCustomerLocally } },
        { provide: NotificationService, useValue: { show: notificationShow } },
      ],
    });
    service = TestBed.inject(EditCustomerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('PATCHes only the editable fields to the edit endpoint', () => {
    const customer = buildCustomer();
    service.editCustomer(customer).subscribe();

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('PATCH');
    // Server-owned fields (status, dates) aren't part of an edit request.
    const { status, createdAt, lastInteractionAt, ...editable } = customer;
    expect(req.request.body).toEqual(editable);

    req.flush({ status: 200, responseMessage: 'Customer updated successfully.' });
  });

  it('updates the customer in the local cache and notifies on success', () => {
    const customer = buildCustomer();
    service.editCustomer(customer).subscribe();

    httpMock
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'Customer updated successfully.' });

    expect(updateCustomerLocally).toHaveBeenCalledWith(customer);
    expect(notificationShow).toHaveBeenCalledWith('Customer updated successfully.');
  });

  it('does not touch the local cache or notify when the request errors', () => {
    service.editCustomer(buildCustomer()).subscribe({ error: () => {} });

    httpMock
      .expectOne(API_URL)
      .flush({ message: 'boom' }, { status: 400, statusText: 'Bad Request' });

    expect(updateCustomerLocally).not.toHaveBeenCalled();
    expect(notificationShow).not.toHaveBeenCalled();
  });
});

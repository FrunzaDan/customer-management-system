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

  const API_URL = `${environment.CustomerManagementSystemAPI}/api/Customer/edit`;

  const buildCustomer = (): Customer => ({
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
    const { customerStatus, creationDate, interactionDate, ...editable } = customer;
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

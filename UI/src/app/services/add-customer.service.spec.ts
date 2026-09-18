import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Customer } from '../interfaces/customer-response';
import { AddCustomerService } from './add-customer.service';
import { HttpHeaderService } from './http-header-service';
import { NotificationService } from './notification.service';

describe('AddCustomerService', () => {
  let service: AddCustomerService;
  let httpMock: HttpTestingController;
  let notificationShow: ReturnType<typeof vi.fn>;

  const API_URL = `${environment.CustomerManagementSystemAPI}/api/Customer/register`;

  const buildCustomer = (): Customer => ({
    guid: '',
    firstName: 'Dan',
    lastName: 'Frunza',
    msisdn: '123456789',
    email: 'dan@example.com',
    gender: 1,
    customerStatus: 1901,
    creationDate: '',
    interactionDate: '',
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
    notificationShow = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: HttpHeaderService,
          useValue: { getHeadersWithTokenSet: () => ({}) },
        },
        { provide: NotificationService, useValue: { show: notificationShow } },
      ],
    });
    service = TestBed.inject(AddCustomerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('addCustomer POSTs the customer to the register endpoint', () => {
    service.addCustomer(buildCustomer()).subscribe();

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(buildCustomer());

    req.flush({ status: 200, responseMessage: 'Customer created successfully.' });
  });

  it('addCustomer shows a success notification once the request resolves', () => {
    service.addCustomer(buildCustomer()).subscribe();

    httpMock
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'Customer created successfully.' });

    expect(notificationShow).toHaveBeenCalledWith('Customer registered successfully.');
  });

  it('addCustomerSilently POSTs to the same endpoint without showing a notification', () => {
    service.addCustomerSilently(buildCustomer()).subscribe();

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    req.flush({ status: 200, responseMessage: 'Customer created successfully.' });

    expect(notificationShow).not.toHaveBeenCalled();
  });
});

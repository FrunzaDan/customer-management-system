import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import {
  CreateCustomerRequest,
  Gender,
} from '../interfaces/customer-response';
import { CreateCustomerService } from './create-customer.service';
import { HttpHeaderService } from './http-header.service';
import { NotificationService } from './notification.service';

describe('CreateCustomerService', () => {
  let service: CreateCustomerService;
  let httpMock: HttpTestingController;
  let notificationShow: ReturnType<typeof vi.fn>;

  const API_URL = `${environment.apiUrl}/api/customer/create`;

  const buildCustomer = (): CreateCustomerRequest => ({
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
    service = TestBed.inject(CreateCustomerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('createCustomer POSTs the customer to the create endpoint', () => {
    service.createCustomer(buildCustomer()).subscribe();

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(buildCustomer());

    req.flush({ status: 200, responseMessage: 'Customer created successfully.' });
  });

  it('createCustomer shows a success notification once the request resolves', () => {
    service.createCustomer(buildCustomer()).subscribe();

    httpMock
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'Customer created successfully.' });

    expect(notificationShow).toHaveBeenCalledWith('Customer registered successfully.');
  });

  it('createCustomerSilently POSTs to the same endpoint without showing a notification', () => {
    service.createCustomerSilently(buildCustomer()).subscribe();

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    req.flush({ status: 200, responseMessage: 'Customer created successfully.' });

    expect(notificationShow).not.toHaveBeenCalled();
  });
});

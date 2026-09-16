import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { DeleteCustomerService } from './delete-customer.service';
import { GetCustomerService } from './get-customer.service';
import { HttpHeaderService } from './http-header-service';
import { NotificationService } from './notification.service';

describe('DeleteCustomerService', () => {
  let service: DeleteCustomerService;
  let httpMock: HttpTestingController;
  let removeCustomerLocally: ReturnType<typeof vi.fn>;
  let notificationShow: ReturnType<typeof vi.fn>;

  const API_URL = `${environment.CustomerManagementSystemAPI}/api/Customer/delete`;

  beforeEach(() => {
    removeCustomerLocally = vi.fn();
    notificationShow = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: HttpHeaderService,
          useValue: { getHeadersWithTokenSet: () => ({}) },
        },
        { provide: GetCustomerService, useValue: { removeCustomerLocally } },
        { provide: NotificationService, useValue: { show: notificationShow } },
      ],
    });
    service = TestBed.inject(DeleteCustomerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('deleteCustomer', () => {
    it('DELETEs with the customerGUID as a query param', () => {
      service.deleteCustomer('guid-1').subscribe();

      const req = httpMock.expectOne((r) => r.url === API_URL);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.params.get('customerGUID')).toBe('guid-1');

      req.flush({ status: 200, responseMessage: 'Customer deleted successfully.' });
    });

    it('removes the customer from the local cache and notifies on success', () => {
      service.deleteCustomer('guid-1').subscribe();

      httpMock
        .expectOne((r) => r.url === API_URL)
        .flush({ status: 200, responseMessage: 'Customer deleted successfully.' });

      expect(removeCustomerLocally).toHaveBeenCalledWith('guid-1');
      expect(notificationShow).toHaveBeenCalledWith('Customer deleted successfully.');
    });

    it('does not touch the local cache or notify when the request errors', () => {
      service.deleteCustomer('guid-1').subscribe({ error: () => {} });

      httpMock
        .expectOne((r) => r.url === API_URL)
        .flush(
          { message: 'Customer must be deactivated before it can be deleted.' },
          { status: 409, statusText: 'Conflict' },
        );

      expect(removeCustomerLocally).not.toHaveBeenCalled();
      expect(notificationShow).not.toHaveBeenCalled();
    });
  });

  describe('deleteCustomerSilently', () => {
    it('DELETEs the same endpoint and updates the local cache, but never notifies', () => {
      service.deleteCustomerSilently('guid-1').subscribe();

      const req = httpMock.expectOne((r) => r.url === API_URL);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.params.get('customerGUID')).toBe('guid-1');
      req.flush({ status: 200, responseMessage: 'Customer deleted successfully.' });

      expect(removeCustomerLocally).toHaveBeenCalledWith('guid-1');
      expect(notificationShow).not.toHaveBeenCalled();
    });
  });
});

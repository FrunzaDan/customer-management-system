import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { CreateProductRequest } from '../interfaces/product';
import { AddProductService } from './add-product.service';
import { HttpHeaderService } from './http-header-service';
import { NotificationService } from './notification.service';

describe('AddProductService', () => {
  let service: AddProductService;
  let httpMock: HttpTestingController;
  let notificationShow: ReturnType<typeof vi.fn>;

  const API_URL = `${environment.apiUrl}/api/customer/product`;

  const buildProduct = (): CreateProductRequest => ({
    name: 'Widget',
    category: 'Gadgets',
    description: null,
    price: 9.99,
    initialQuantity: 10,
    warehouse: 'Cluj',
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
    service = TestBed.inject(AddProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('addProduct POSTs the product to the product endpoint', () => {
    service.addProduct(buildProduct()).subscribe();

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(buildProduct());

    req.flush({ status: 200, responseMessage: 'Product created successfully.' });
  });

  it('addProduct shows a success notification once the request resolves', () => {
    service.addProduct(buildProduct()).subscribe();

    httpMock
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'Product created successfully.' });

    expect(notificationShow).toHaveBeenCalledWith('Product added successfully.');
  });
});

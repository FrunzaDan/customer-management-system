import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../interfaces/generic-response';
import { LoginData } from '../interfaces/user-login-response';
import { HttpHeaderService } from './http-header-service';
import { NotificationService } from './notification.service';
import { SessionStorageService } from './session-storage.service';
import { UserLoginService } from './user-login.service';

describe('UserLoginService', () => {
  let service: UserLoginService;
  let httpMock: HttpTestingController;
  let navigateByUrl: ReturnType<typeof vi.fn>;
  let setSessionAccessToken: ReturnType<typeof vi.fn>;
  let notificationShow: ReturnType<typeof vi.fn>;

  const API_URL = `${environment.CustomerManagementSystemAPI}/api/Authentication/access-token`;

  const buildResponse = (
    overrides: Partial<GenericResponse<LoginData>> = {},
  ): GenericResponse<LoginData> => ({
    status: 200,
    responseMessage: 'Success!',
    data: { accessToken: 'jwt-123', validUntil: '2026-01-01T00:15:00' },
    ...overrides,
  });

  beforeEach(() => {
    navigateByUrl = vi.fn();
    setSessionAccessToken = vi.fn();
    notificationShow = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: SessionStorageService,
          useValue: { setSessionAccessToken, getSessionAccessToken: () => null },
        },
        { provide: NotificationService, useValue: { show: notificationShow } },
      ],
    });
    service = TestBed.inject(UserLoginService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts the credentials to the access-token endpoint', () => {
    service
      .login({ merchantId: 'TestMerchantID', merchantPassword: 'Merchant123' })
      .subscribe();

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      merchantId: 'TestMerchantID',
      merchantPassword: 'Merchant123',
    });

    req.flush(buildResponse());
  });

  it('checkCredentials stores the token, notifies, and navigates on a 200 with an access token', () => {
    const result = service.checkCredentials(buildResponse());

    expect(result).toEqual({ success: true, message: 'Success!' });
    expect(setSessionAccessToken).toHaveBeenCalledWith('jwt-123');
    expect(notificationShow).toHaveBeenCalledWith('Login successful.');
    expect(navigateByUrl).toHaveBeenCalledWith('customers');
  });

  it('checkCredentials reports failure and does nothing else when status is not 200', () => {
    const response = buildResponse({
      status: 401,
      responseMessage: 'Invalid Merchant ID or Password.',
    });

    const result = service.checkCredentials(response);

    expect(result).toEqual({
      success: false,
      message: 'Invalid Merchant ID or Password.',
    });
    expect(setSessionAccessToken).not.toHaveBeenCalled();
    expect(notificationShow).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('checkCredentials reports failure when status is 200 but no access token is present', () => {
    const response = buildResponse({ data: undefined });

    const result = service.checkCredentials(response);

    expect(result.success).toBe(false);
    expect(setSessionAccessToken).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});

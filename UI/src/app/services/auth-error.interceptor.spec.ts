import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authErrorInterceptor } from './auth-error.interceptor';
import { SessionStorageService } from './session-storage.service';

describe('authErrorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let navigate: ReturnType<typeof vi.fn>;
  let removeSessionStorage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigate = vi.fn();
    removeSessionStorage = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate } },
        { provide: SessionStorageService, useValue: { removeSessionStorage } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('clears the session and redirects to login on a 401 from a non-auth endpoint', () => {
    let errored = false;
    http
      .get('https://localhost:7145/api/customer/all')
      .subscribe({ error: () => (errored = true) });

    httpMock
      .expectOne('https://localhost:7145/api/customer/all')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(errored).toBe(true);
    expect(removeSessionStorage).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['login'], {
      queryParams: { sessionExpired: true },
    });
  });

  it('does not redirect on a 401 from an Authentication endpoint', () => {
    let errored = false;
    http
      .post('https://localhost:7145/api/authentication/access-token', {})
      .subscribe({ error: () => (errored = true) });

    httpMock
      .expectOne('https://localhost:7145/api/authentication/access-token')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(errored).toBe(true);
    expect(removeSessionStorage).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not redirect on a non-401 error from a protected endpoint', () => {
    let errored = false;
    http
      .get('https://localhost:7145/api/customer/all')
      .subscribe({ error: () => (errored = true) });

    httpMock
      .expectOne('https://localhost:7145/api/customer/all')
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(errored).toBe(true);
    expect(removeSessionStorage).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});

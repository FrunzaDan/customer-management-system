import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { authTokenInterceptor } from './auth-token.interceptor';
import { SessionStorageService } from './session-storage.service';

describe('authTokenInterceptor', () => {
  const apiUrl = `${environment.apiUrl}/api/some-resource`;
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let getSessionAccessToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getSessionAccessToken = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        {
          provide: SessionStorageService,
          useValue: { getSessionAccessToken },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds a Bearer Authorization header to API requests when signed in', () => {
    getSessionAccessToken.mockReturnValue('jwt-123');

    http.get(apiUrl).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-123');
    req.flush({});
  });

  it('sends API requests without an Authorization header when there is no token', () => {
    getSessionAccessToken.mockReturnValue(null);

    http.get(apiUrl).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('never sends the token to another origin', () => {
    getSessionAccessToken.mockReturnValue('jwt-123');

    http.get('https://example.com/data.json').subscribe();

    const req = httpMock.expectOne('https://example.com/data.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(getSessionAccessToken).not.toHaveBeenCalled();
    req.flush({});
  });

  it('leaves Content-Type to HttpClient', () => {
    getSessionAccessToken.mockReturnValue('jwt-123');

    http.get(apiUrl).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.headers.has('Content-Type')).toBe(false);
    req.flush({});
  });
});

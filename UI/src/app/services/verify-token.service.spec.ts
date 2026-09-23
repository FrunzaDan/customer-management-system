import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { HttpHeaderService } from './http-header.service';
import { VerifyTokenService } from './verify-token.service';

describe('VerifyTokenService', () => {
  let service: VerifyTokenService;
  let httpMock: HttpTestingController;
  let getHeadersWithTokenSet: ReturnType<typeof vi.fn>;

  const API_URL = `${environment.apiUrl}/api/authentication/verify-token`;

  beforeEach(() => {
    getHeadersWithTokenSet = vi.fn().mockReturnValue({});

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: HttpHeaderService, useValue: { getHeadersWithTokenSet } },
      ],
    });
    service = TestBed.inject(VerifyTokenService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('calls GET verify-token', () => {
    service.verifyTokenViaAPI().subscribe();

    const req = httpMock.expectOne(API_URL);
    expect(req.request.method).toBe('GET');

    req.flush({ status: 200, responseMessage: 'ok' });
  });

  it('isTokenValid emits true when the API call succeeds', () => {
    let result: boolean | undefined;
    service.isTokenValid().subscribe((value) => (result = value));

    httpMock.expectOne(API_URL).flush({ status: 200, responseMessage: 'ok' });

    expect(result).toBe(true);
  });

  it('isTokenValid emits false (not an error) when the API call fails with 401', () => {
    let result: boolean | undefined;
    let errored = false;
    service.isTokenValid().subscribe({
      next: (value) => (result = value),
      error: () => (errored = true),
    });

    httpMock
      .expectOne(API_URL)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(result).toBe(false);
    expect(errored).toBe(false);
  });

  it('isTokenValid emits false on a network error', () => {
    let result: boolean | undefined;
    service.isTokenValid().subscribe((value) => (result = value));

    httpMock
      .expectOne(API_URL)
      .error(new ProgressEvent('error'), { status: 0 });

    expect(result).toBe(false);
  });
});

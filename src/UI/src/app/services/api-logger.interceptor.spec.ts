import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { apiLoggerInterceptor } from './api-logger.interceptor';
import { ApiLoggerService } from './api-logger.service';

const URL = 'https://localhost/api/test';

describe('apiLoggerInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let log: ReturnType<typeof vi.spyOn>;
  const enabled = signal(true);

  function setup(platformId = 'browser'): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiLoggerInterceptor])),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: ApiLoggerService, useValue: { enabled } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    enabled.set(true);
    log = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('logs the request and the response, with their bodies', () => {
    setup();
    http.post(URL, { name: 'Ana' }).subscribe();

    httpMock.expectOne(URL).flush({ id: 1 });

    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0][0]).toContain(`→ POST ${URL}`);
    expect(log.mock.calls[0][2]).toEqual({ body: { name: 'Ana' } });
    expect(log.mock.calls[1][0]).toMatch(/← POST .+ 200 \(\d+ms\)/);
    expect(log.mock.calls[1][2]).toEqual({ body: { id: 1 } });
  });

  it('logs a failed request with its error body and still propagates the error', () => {
    setup();
    let errored = false;
    http.get(URL).subscribe({ error: () => (errored = true) });

    httpMock
      .expectOne(URL)
      .flush(
        { title: 'Not Found', traceId: '00-abc-01' },
        { status: 404, statusText: 'Not Found' },
      );

    expect(errored).toBe(true);
    expect(log.mock.calls[1][0]).toMatch(/✖ GET .+ 404 \(\d+ms\)/);
    expect(log.mock.calls[1][2]).toEqual({
      error: { title: 'Not Found', traceId: '00-abc-01' },
    });
  });

  it('redacts a password in the request and an access token in the response', () => {
    setup();
    http.post(URL, { username: 'u', password: 'secret' }).subscribe();

    httpMock
      .expectOne(URL)
      .flush({ status: 200, data: { accessToken: 'jwt', expiresIn: 900 } });

    expect(log.mock.calls[0][2]).toEqual({
      body: { username: 'u', password: '••••••••' },
    });
    expect(log.mock.calls[1][2]).toEqual({
      body: { status: 200, data: { accessToken: '••••••••', expiresIn: 900 } },
    });
  });

  it('logs nothing when switched off', () => {
    enabled.set(false);
    setup();
    http.get(URL).subscribe();

    httpMock.expectOne(URL).flush({});

    expect(log).not.toHaveBeenCalled();
  });

  it('logs nothing during server-side rendering', () => {
    setup('server');
    http.get(URL).subscribe();

    httpMock.expectOne(URL).flush({});

    expect(log).not.toHaveBeenCalled();
  });
});

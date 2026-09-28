import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { CustomerInsights } from '../interfaces/customer-insights';
import { CustomerInsightsService } from './customer-insights.service';

describe('CustomerInsightsService', () => {
  let service: CustomerInsightsService;
  let httpMock: HttpTestingController;

  const API_URL = `${environment.apiUrl}/api/customer/insights`;
  const EMPTY = { customers: [], monthlySales: [] };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CustomerInsightsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const load = () => {
    service.loadInsights();
    TestBed.tick();
  };

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  it('makes no request until loadInsights() is called', () => {
    TestBed.tick();

    httpMock.expectNone(API_URL);
    expect(service.insights()).toEqual(EMPTY);
    expect(service.loading()).toBe(false);
  });

  it('populates insights from a successful response', async () => {
    const insights: CustomerInsights = {
      customers: [
        {
          status: 1901,
          gender: 2,
          birthDate: '1990-04-01',
          enrollmentDate: '2012-05-20',
          county: 'Cluj',
          purchaseCount: 3,
        },
      ],
      monthlySales: [
        { yearMonth: '2026-01', purchaseCount: 12, revenue: 4500 },
      ],
    };

    load();
    httpMock
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: insights });
    await settle();

    expect(service.insights()).toEqual(insights);
    expect(service.error()).toBeNull();
  });

  it('reloads on a second loadInsights() call, so the page shows fresh data', async () => {
    load();
    httpMock
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: EMPTY });
    await settle();

    load();

    httpMock
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: EMPTY });
    await settle();
  });

  it('falls back to empty insights when the response has no data', async () => {
    load();
    httpMock
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: undefined });
    await settle();

    expect(service.insights()).toEqual(EMPTY);
  });

  it('surfaces the server-provided error message when present', async () => {
    load();

    httpMock
      .expectOne(API_URL)
      .flush(
        { title: 'Server Error', status: 500, detail: 'boom' },
        { status: 500, statusText: 'Server Error' },
      );
    await settle();

    expect(service.loading()).toBe(false);
    expect(service.error()).toBe('boom');
    expect(service.insights()).toEqual(EMPTY);
  });
});

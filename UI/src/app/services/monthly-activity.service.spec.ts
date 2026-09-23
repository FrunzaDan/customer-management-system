import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { MonthlyActivityService } from './monthly-activity.service';

describe('MonthlyActivityService', () => {
  let service: MonthlyActivityService;
  let httpMock: HttpTestingController;

  const API_URL = `${environment.apiUrl}/api/customer/monthly-activity`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MonthlyActivityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // httpResource issues its request from an effect, so flush effects after
  // calling loadMonthlyActivity() before expecting the HTTP call.
  const load = () => {
    service.loadMonthlyActivity();
    TestBed.tick();
  };

  // ...and the response is applied asynchronously, so wait for the app to settle
  // after flushing before asserting on the signals.
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  it('makes no request until loadMonthlyActivity() is called', () => {
    TestBed.tick();

    httpMock.expectNone(API_URL);
    expect(service.activity()).toEqual({
      customerCreations: [],
      productPurchases: [],
    });
    expect(service.loading()).toBe(false);
  });

  it('populates activity from a successful response', async () => {
    const activity = {
      customerCreations: [{ yearMonth: '2026-01', count: 3 }],
      productPurchases: [{ yearMonth: '2026-01', count: 12 }],
    };

    load();
    httpMock
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: activity });
    await settle();

    expect(service.activity()).toEqual(activity);
    expect(service.error()).toBeNull();
  });

  it('falls back to empty series when the resource has no value', () => {
    load();
    // Not flushed yet — hasValue() is still false.
    expect(service.activity()).toEqual({
      customerCreations: [],
      productPurchases: [],
    });
    httpMock
      .expectOne(API_URL)
      .flush({ status: 200, responseMessage: 'ok', data: undefined });
  });

  it('surfaces the server-provided error message when present', async () => {
    load();

    httpMock
      .expectOne(API_URL)
      .flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(service.loading()).toBe(false);
    expect(service.error()).toBe('boom');
    expect(service.activity()).toEqual({
      customerCreations: [],
      productPurchases: [],
    });
  });
});

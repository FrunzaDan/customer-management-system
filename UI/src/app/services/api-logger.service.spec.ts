import { isDevMode } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiLoggerService } from './api-logger.service';

describe('ApiLoggerService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults to on in development builds and off in production ones', () => {
    expect(TestBed.inject(ApiLoggerService).enabled()).toBe(isDevMode());
  });

  it('starts from the choice remembered in localStorage', () => {
    localStorage.setItem('apiLoggingEnabled', String(!isDevMode()));

    expect(TestBed.inject(ApiLoggerService).enabled()).toBe(!isDevMode());
  });

  it('toggles and remembers the new value', () => {
    const service = TestBed.inject(ApiLoggerService);
    const initial = service.enabled();

    service.toggle();

    expect(service.enabled()).toBe(!initial);
    expect(localStorage.getItem('apiLoggingEnabled')).toBe(String(!initial));
  });

  it('still toggles when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    const service = TestBed.inject(ApiLoggerService);

    expect(service.enabled()).toBe(isDevMode());
    service.setEnabled(false);
    expect(service.enabled()).toBe(false);
  });
});

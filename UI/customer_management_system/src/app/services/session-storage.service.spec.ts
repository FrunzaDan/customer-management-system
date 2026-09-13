import { TestBed } from '@angular/core/testing';
import { SessionStorageService } from './session-storage.service';

describe('SessionStorageService', () => {
  let service: SessionStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionStorageService);
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('returns null when no token has been set', () => {
    expect(service.getSessionAccessToken()).toBeNull();
  });

  it('round-trips a token through set/get', () => {
    service.setSessionAccessToken('jwt-123');

    expect(service.getSessionAccessToken()).toBe('jwt-123');
  });

  it('stores the token under the accessToken key directly in sessionStorage', () => {
    service.setSessionAccessToken('jwt-123');

    expect(sessionStorage.getItem('accessToken')).toBe('jwt-123');
  });

  it('removeSessionStorage clears a previously set token', () => {
    service.setSessionAccessToken('jwt-123');

    service.removeSessionStorage();

    expect(service.getSessionAccessToken()).toBeNull();
  });

  it('returns null (not a sentinel string) when reading the token throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(service.getSessionAccessToken()).toBeNull();
  });
});

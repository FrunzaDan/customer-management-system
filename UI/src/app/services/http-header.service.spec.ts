import { TestBed } from '@angular/core/testing';
import { HttpHeaderService } from './http-header.service';
import { SessionStorageService } from './session-storage.service';

describe('HttpHeaderService', () => {
  let service: HttpHeaderService;
  let getSessionAccessToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getSessionAccessToken = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: SessionStorageService,
          useValue: { getSessionAccessToken },
        },
      ],
    });
    service = TestBed.inject(HttpHeaderService);
  });

  it('always sets Content-Type to application/json', () => {
    getSessionAccessToken.mockReturnValue(null);

    const headers = service.getHeadersWithTokenSet();

    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('adds a Bearer Authorization header when a token is present', () => {
    getSessionAccessToken.mockReturnValue('jwt-123');

    const headers = service.getHeadersWithTokenSet();

    expect(headers.get('Authorization')).toBe('Bearer jwt-123');
  });

  it('omits the Authorization header entirely when there is no token', () => {
    getSessionAccessToken.mockReturnValue(null);

    const headers = service.getHeadersWithTokenSet();

    expect(headers.has('Authorization')).toBe(false);
  });
});

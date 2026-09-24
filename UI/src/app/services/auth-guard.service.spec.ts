import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthGuardService } from './auth-guard.service';
import { SessionStorageService } from './session-storage.service';
import { VerifyTokenService } from './verify-token.service';

describe('AuthGuardService', () => {
  let service: AuthGuardService;
  let isTokenValid: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let removeSessionStorage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    isTokenValid = vi.fn();
    navigate = vi.fn();
    removeSessionStorage = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: VerifyTokenService, useValue: { isTokenValid } },
        { provide: Router, useValue: { navigate } },
        { provide: SessionStorageService, useValue: { removeSessionStorage } },
      ],
    });
    service = TestBed.inject(AuthGuardService);
  });

  it('allows navigation and does nothing else when the token is valid', () => {
    isTokenValid.mockReturnValue(of(true));

    let result: boolean | undefined;
    service.canActivate().subscribe((value) => (result = value));

    expect(result).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(removeSessionStorage).not.toHaveBeenCalled();
  });

  it('clears the session and redirects to login with sessionExpired when the token is invalid', () => {
    isTokenValid.mockReturnValue(of(false));

    let result: boolean | undefined;
    service.canActivate().subscribe((value) => (result = value));

    expect(result).toBe(false);
    expect(removeSessionStorage).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['login'], {
      queryParams: { sessionExpired: true },
    });
  });

  it('clears the session and redirects to login when the verification call itself errors', () => {
    isTokenValid.mockReturnValue(throwError(() => new Error('network down')));

    let result: boolean | undefined;
    service.canActivate().subscribe((value) => (result = value));

    expect(result).toBe(false);
    expect(removeSessionStorage).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['login'], {
      queryParams: { sessionExpired: true },
    });
  });
});

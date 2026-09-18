import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SessionStorageService {
  private readonly accessTokenKey = 'accessToken';

  getSessionAccessToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return sessionStorage.getItem(this.accessTokenKey);
    } catch (parseError: unknown) {
      console.error(
        'Error parsing products from session storage:',
        parseError,
      );
      return null;
    }
  }

  setSessionAccessToken(sessionStorageAccessToken: string): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('accessToken', sessionStorageAccessToken);
    }
  }

  removeSessionStorage(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
  }
}

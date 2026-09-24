import { Injectable, isDevMode, signal } from '@angular/core';

const STORAGE_KEY = 'apiLoggingEnabled';

// Whether apiLoggerInterceptor mirrors API calls to the devtools console. On by
// default in development builds only — a production console shouldn't carry
// every request and response body unless someone asks for it (About page
// toggle). The choice is remembered per browser.
@Injectable({
  providedIn: 'root',
})
export class ApiLoggerService {
  readonly enabled = signal(this.readInitialValue());

  toggle(): void {
    this.setEnabled(!this.enabled());
  }

  setEnabled(value: boolean): void {
    this.enabled.set(value);
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Storage blocked (private mode, site data disabled): the toggle still
      // works, it just isn't remembered.
    }
  }

  private readInitialValue(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? isDevMode() : stored === 'true';
    } catch {
      return isDevMode();
    }
  }
}

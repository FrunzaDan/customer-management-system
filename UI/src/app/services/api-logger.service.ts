import { Injectable, isDevMode, signal } from '@angular/core';

const STORAGE_KEY = 'apiLoggingEnabled';

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
    } catch {}
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

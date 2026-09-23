import { Injectable, signal } from '@angular/core';

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
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(value));
    }
  }

  private readInitialValue(): boolean {
    if (typeof window === 'undefined') {
      return true;
    }
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  }
}

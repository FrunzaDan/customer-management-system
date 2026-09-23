import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const DEFAULT_DURATION_MS = 6000;

// Toasts confirm that something the user did succeeded, and report failures
// that have no better place on the page (a background or bulk operation).
// A failure tied to a form or a button is shown inline, next to it, instead.
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  private nextId = 0;

  // An error stays until dismissed (durationMs 0): it may need more than a few
  // seconds to read, and it shouldn't vanish before the user notices it.
  show(
    message: string,
    type: Notification['type'] = 'success',
    durationMs = type === 'error' ? 0 : DEFAULT_DURATION_MS,
  ): void {
    const id = ++this.nextId;
    this._notifications.update((list) => [...list, { id, message, type }]);

    if (durationMs > 0) {
      setTimeout(() => this.dismiss(id), durationMs);
    }
  }

  dismiss(id: number): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }
}

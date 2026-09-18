import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const DEFAULT_DURATION_MS = 3000;

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  private nextId = 0;

  show(message: string, type: Notification['type'] = 'success', durationMs = DEFAULT_DURATION_MS): void {
    const id = ++this.nextId;
    this._notifications.update((list) => [...list, { id, message, type }]);

    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this._notifications.update((list) => list.filter((n) => n.id !== id));
  }
}

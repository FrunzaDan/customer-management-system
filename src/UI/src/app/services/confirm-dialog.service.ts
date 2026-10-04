import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

export type ConfirmState = Required<ConfirmOptions> & { message: string };

const CLOSE_ANIMATION_MS = 150;

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly _state = signal<ConfirmState | null>(null);
  private readonly _closing = signal(false);
  readonly state = this._state.asReadonly();
  readonly closing = this._closing.asReadonly();

  private resolver: ((result: boolean) => void) | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    this.resolver?.(false);
    clearTimeout(this.closeTimer);

    this._closing.set(false);
    this._state.set({
      message,
      title: options.title ?? 'Please confirm',
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      variant: options.variant ?? 'default',
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  respond(result: boolean): void {
    if (!this.resolver) return;
    const resolve = this.resolver;
    this.resolver = null;
    resolve(result);

    this._closing.set(true);
    this.closeTimer = setTimeout(() => {
      this._state.set(null);
      this._closing.set(false);
    }, CLOSE_ANIMATION_MS);
  }
}

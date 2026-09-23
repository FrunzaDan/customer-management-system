import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // 'danger' marks an action that can't be undone (delete, discard edits); the
  // confirm button is styled to stand out from a routine confirmation.
  variant?: 'default' | 'danger';
}

export type ConfirmState = Required<ConfirmOptions> & { message: string };

// Matches confirm-dialog.component.css's close animation — the dialog stays
// mounted (with closing() true) this long after respond() before it's removed.
const CLOSE_ANIMATION_MS = 150;

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly _state = signal<ConfirmState | null>(null);
  private readonly _closing = signal(false);
  readonly state = this._state.asReadonly();
  readonly closing = this._closing.asReadonly();

  private resolver: ((result: boolean) => void) | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  // Replaces window.confirm(): resolves true/false once the user picks an
  // option, instead of blocking the browser thread with a native dialog.
  // Buttons default to Cancel / Confirm; pass labels that say what will
  // actually happen (e.g. "Delete", "Discard changes").
  confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    // One dialog at a time: a newer question replaces an unanswered one, which
    // counts as "no" rather than leaving its caller waiting forever.
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

  // Callers get the answer at once; only the dialog's removal from the DOM
  // waits for the close animation.
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

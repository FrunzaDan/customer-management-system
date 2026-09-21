import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

const DEFAULT_TITLE = 'Please confirm';
const DEFAULT_CONFIRM_LABEL = 'Confirm';
const DEFAULT_CANCEL_LABEL = 'Cancel';

@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogService {
  // Matches confirm-dialog.component.css's zoom-out/fade-out duration — the
  // dialog stays mounted (playing the close animation) for this long after
  // respond() before it's actually removed.
  private static readonly CLOSE_ANIMATION_MS = 150;

  private readonly _message = signal('');
  private readonly _title = signal(DEFAULT_TITLE);
  private readonly _confirmLabel = signal(DEFAULT_CONFIRM_LABEL);
  private readonly _cancelLabel = signal(DEFAULT_CANCEL_LABEL);
  private readonly _visible = signal(false);
  private readonly _closing = signal(false);

  readonly message = this._message.asReadonly();
  readonly title = this._title.asReadonly();
  readonly confirmLabel = this._confirmLabel.asReadonly();
  readonly cancelLabel = this._cancelLabel.asReadonly();
  readonly visible = this._visible.asReadonly();
  readonly closing = this._closing.asReadonly();

  private resolver: ((result: boolean) => void) | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  // Replaces window.confirm(): resolves true/false once the user picks an
  // option, instead of blocking the browser thread with a native dialog.
  // Buttons default to Cancel / Confirm; pass labels that say what will actually
  // happen when the generic wording would be ambiguous (e.g. "Discard changes").
  confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    clearTimeout(this.closeTimer);
    this._message.set(message);
    this._title.set(options.title ?? DEFAULT_TITLE);
    this._confirmLabel.set(options.confirmLabel ?? DEFAULT_CONFIRM_LABEL);
    this._cancelLabel.set(options.cancelLabel ?? DEFAULT_CANCEL_LABEL);
    this._visible.set(true);
    this._closing.set(false);

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  respond(result: boolean): void {
    if (!this.resolver) return;
    const resolve = this.resolver;
    this.resolver = null;

    this._closing.set(true);
    this.closeTimer = setTimeout(() => {
      this._visible.set(false);
      this._closing.set(false);
    }, ConfirmDialogService.CLOSE_ANIMATION_MS);

    resolve(result);
  }
}

import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

// WAI-ARIA "alertdialog" pattern: labelled by its title, described by its
// message, focus moved in on open, kept inside while open, returned on close.
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class ConfirmDialogComponent {
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly document = inject(DOCUMENT);

  readonly state = this.confirmDialogService.state;
  readonly closing = this.confirmDialogService.closing;

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly cancelButton =
    viewChild<ElementRef<HTMLButtonElement>>('cancelButton');

  // Where focus was before the dialog opened, so it can go back there (WCAG 2.4.3).
  private returnFocusTo: HTMLElement | null = null;

  constructor() {
    // Opening: remember the trigger, then focus the *non-destructive* choice.
    effect(() => {
      const cancel = this.cancelButton();
      if (!cancel) return;
      untracked(() => {
        const active = this.document.activeElement;
        this.returnFocusTo = active instanceof HTMLElement ? active : null;
        cancel.nativeElement.focus();
      });
    });

    // Closing: hand focus back as soon as the user answers.
    effect(() => {
      if (!this.closing()) return;
      untracked(() => {
        this.returnFocusTo?.focus();
        this.returnFocusTo = null;
      });
    });
  }

  respond(result: boolean): void {
    this.confirmDialogService.respond(result);
  }

  onEscape(): void {
    if (this.state() && !this.closing()) {
      this.respond(false);
    }
  }

  // aria-modal tells assistive tech the page behind is inert, but keyboard Tab
  // still walks the page unless focus is contained.
  trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const buttons = Array.from(
      this.dialog()?.nativeElement.querySelectorAll<HTMLElement>('button') ?? [],
    );
    if (buttons.length === 0) return;

    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    const active = this.document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

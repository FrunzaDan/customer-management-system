import { Component, HostListener, inject } from '@angular/core';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css'],
})
export class ConfirmDialogComponent {
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly message = this.confirmDialogService.message;
  readonly visible = this.confirmDialogService.visible;
  readonly closing = this.confirmDialogService.closing;

  respond(result: boolean): void {
    this.confirmDialogService.respond(result);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible() && !this.closing()) {
      this.respond(false);
    }
  }
}

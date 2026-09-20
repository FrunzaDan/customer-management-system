import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { GlobalAuditLogService } from '../../services/global-audit-log.service';
import { GlobalAuditLogEntry } from '../../interfaces/global-audit-log-entry';
import { extractErrorMessage } from '../../utils/extract-error-message';

@Component({
  selector: 'app-global-audit-log',
  templateUrl: './global-audit-log.component.html',
  styleUrls: ['./global-audit-log.component.css'],
  imports: [DatePipe, RouterLink],
})
export class GlobalAuditLogComponent implements OnInit {
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly globalAuditLogService = inject(GlobalAuditLogService);

  readonly entries = this.globalAuditLogService.entriesSignal;
  readonly isLoading = this.globalAuditLogService.loadingSignal;
  readonly errorMessage = this.globalAuditLogService.errorSignal;
  readonly totalItems = this.globalAuditLogService.totalItemsSignal;

  readonly pageSize = 20;
  readonly currentPage = signal(1);

  readonly clearing = signal(false);
  readonly clearError = signal<string | null>(null);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize)),
  );

  ngOnInit(): void {
    this.fetchAuditLog();
  }

  goToPage(page: number): void {
    const target = Math.min(Math.max(page, 1), this.totalPages());
    if (target === this.currentPage()) return;
    this.currentPage.set(target);
    this.fetchAuditLog();
  }

  customerLabel(entry: GlobalAuditLogEntry): string {
    if (!entry.customerFirstName && !entry.customerLastName) {
      return `(deleted customer ${entry.customerGuid})`;
    }
    return `${entry.customerFirstName ?? ''} ${entry.customerLastName ?? ''}`.trim();
  }

  async clearAuditLog(): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm(
      'Are you sure you want to permanently delete the entire audit log? This cannot be undone.',
    );
    if (!confirmed) return;

    this.clearing.set(true);
    this.clearError.set(null);

    this.globalAuditLogService.deleteAllAuditLog().subscribe({
      next: () => {
        this.clearing.set(false);
        this.currentPage.set(1);
      },
      error: (error: HttpErrorResponse) => {
        this.clearing.set(false);
        this.clearError.set(extractErrorMessage(error));
      },
    });
  }

  private fetchAuditLog(): void {
    this.globalAuditLogService.loadAllAuditLog({
      pageNumber: this.currentPage(),
      pageSize: this.pageSize,
    });
  }
}

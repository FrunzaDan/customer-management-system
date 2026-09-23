import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { GlobalAuditLogService } from '../../services/global-audit-log.service';
import { GlobalAuditLogEntry } from '../../interfaces/global-audit-log-entry';
import { auditActionLabel } from '../../utils/audit-action-label';
import { extractErrorMessage } from '../../utils/extract-error-message';

@Component({
  selector: 'app-global-audit-log',
  templateUrl: './global-audit-log.component.html',
  styleUrl: './global-audit-log.component.css',
  imports: [DatePipe, RouterLink],
})
export class GlobalAuditLogComponent implements OnInit {
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly globalAuditLogService = inject(GlobalAuditLogService);

  readonly auditActionLabel = auditActionLabel;

  readonly entries = this.globalAuditLogService.entries;
  readonly isLoading = this.globalAuditLogService.loading;
  readonly errorMessage = this.globalAuditLogService.error;
  readonly totalItems = this.globalAuditLogService.totalItems;

  readonly pageSize = 50;
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
      return `(deleted customer ${entry.customerId})`;
    }
    return `${entry.customerFirstName ?? ''} ${entry.customerLastName ?? ''}`.trim();
  }

  async clearAuditLog(): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm(
      'Are you sure you want to permanently delete the entire audit log? This cannot be undone.',
      { title: 'Delete audit log?', confirmLabel: 'Delete', variant: 'danger' },
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
        this.clearError.set(
          extractErrorMessage(error, 'Failed to clear the audit log'),
        );
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

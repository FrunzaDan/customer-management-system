// customer-list.component.ts
import { Component, OnInit, computed, effect, signal, Signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, concatMap, from, map, of, toArray } from 'rxjs';
import { GetCustomerService } from '../../services/get-customer.service';
import { ActivateCustomerService } from '../../services/activate-customer.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { DeleteCustomerService } from '../../services/delete-customer.service';
import { ExportCustomerService } from '../../services/export-customer.service';
import { NotificationService } from '../../services/notification.service';
import {
  Customer,
  CustomerActivationStatus,
} from '../../interfaces/customer-response';
import { extractErrorMessage } from '../../utils/extract-error-message';

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.css'],
  imports: [RouterLink],
})
export class CustomerListComponent implements OnInit {
  // Use dependency injection with inject()
  private readonly getCustomerService = inject(GetCustomerService);
  private readonly activateCustomerService = inject(ActivateCustomerService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly deleteCustomerService = inject(DeleteCustomerService);
  private readonly exportCustomerService = inject(ExportCustomerService);
  private readonly notificationService = inject(NotificationService);

  // Public signals for template
  readonly customers = this.getCustomerService.customersSignal;
  readonly isLoading = this.getCustomerService.loadingSignal;
  readonly errorMessage = this.getCustomerService.errorSignal;
  readonly activationLoading = this.activateCustomerService.loadingSignal;
  readonly activationError = this.activateCustomerService.errorSignal;

  // Delete is a separate action from deactivate/reactivate, so it gets its own
  // in-flight/error state rather than being folded into activationLoading/Error.
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  // Bulk-delete selection is scoped to the current page only — the checkboxes
  // reference rows that actually exist in the browser, and selection is reset
  // on every fetchCustomers() (page/search/sort change, or after the bulk
  // action itself refreshes the page).
  readonly selectedGuids = signal<ReadonlySet<string>>(new Set());
  readonly bulkActionInProgress = signal(false);

  readonly allOnPageSelected = computed(
    () =>
      this.customers().length > 0 &&
      this.customers().every((c) => this.selectedGuids().has(c.guid)),
  );

  // CSV export exports whatever the list is currently searching/sorted by,
  // not just the current page — see ExportCustomerService.
  readonly exportLoading = this.exportCustomerService.loadingSignal;
  readonly exportError = this.exportCustomerService.errorSignal;

  // Add CustomerStatus enum for better type checking
  readonly CustomerStatus = CustomerActivationStatus;

  readonly statusLabels = new Map<Customer['customerStatus'], string>([
    [CustomerActivationStatus.Active, 'Active'],
    [CustomerActivationStatus.Deactivated, 'Deactivated'],
    [CustomerActivationStatus.Test, 'Test'],
  ]);

  // Search, sorting, and pagination are all server-side now: every change to
  // any of these re-fetches just the relevant page from the API rather than
  // filtering/sorting an already-loaded full list in memory (see
  // GetCustomerService.loadCustomers and Customer_List).
  readonly searchTerm = signal('');
  readonly sortColumn = signal<'name' | 'email' | 'msisdn'>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly pageSize = 50;
  readonly currentPage = signal(1);

  readonly totalItems = this.getCustomerService.totalItemsSignal;
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize)),
  );

  // Spoken by the polite live region so a screen-reader user hears the outcome
  // of a search / page change without hunting for it.
  readonly resultsAnnouncement = computed(() => {
    if (this.isLoading()) return 'Loading customers';
    const total = this.totalItems();
    return `${total} ${total === 1 ? 'customer' : 'customers'} found`;
  });

  readonly tableCaption = computed(
    () =>
      `Customers, page ${this.currentPage()} of ${this.totalPages()}, sorted by ${this.sortColumn()} ${this.sortDirection() === 'asc' ? 'ascending' : 'descending'}`,
  );

  // Debounced so typing doesn't fire an API call per keystroke — the search
  // used to be a synchronous in-memory filter, but now it's a network call.
  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private static readonly SEARCH_DEBOUNCE_MS = 300;

  // Computed signal for duplicate GUIDs
  readonly duplicateGuids = computed(() => {
    const customers = this.customers();
    const guidCount = new Map<string, number>();

    customers.forEach((customer) => {
      const count = guidCount.get(customer.guid) ?? 0;
      guidCount.set(customer.guid, count + 1);
    });

    return Array.from(guidCount.entries())
      .filter(([_, count]) => count > 1)
      .map(([guid]) => guid);
  });

  constructor() {
    // duplicateGuids() is a computed signal, so re-run this check whenever
    // it actually changes instead of only once, synchronously, right after
    // the (async) loadCustomers() call in ngOnInit.
    effect(() => {
      const duplicates = this.duplicateGuids();
      if (duplicates.length > 0) {
        console.warn('Duplicate GUIDs found:', duplicates);
      }
    });

  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);

    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      // A narrower search can make the current page go out of range (e.g.
      // you're on page 3, then a search narrows results to one page) —
      // snap back to page 1 on every new search term.
      this.currentPage.set(1);
      this.fetchCustomers();
    }, CustomerListComponent.SEARCH_DEBOUNCE_MS);
  }

  goToPage(page: number): void {
    const target = Math.min(Math.max(page, 1), this.totalPages());
    if (target === this.currentPage()) return;
    this.currentPage.set(target);
    this.fetchCustomers();
  }

  // Exposed on the <th> so assistive tech announces the current sort.
  ariaSort(column: 'name' | 'email' | 'msisdn'): 'ascending' | 'descending' | 'none' {
    if (this.sortColumn() !== column) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  setSort(column: 'name' | 'email' | 'msisdn'): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
    this.fetchCustomers();
  }

  ngOnInit(): void {
    this.fetchCustomers();
  }

  exportCsv(): void {
    this.exportCustomerService.exportCustomers({
      searchTerm: this.searchTerm().trim() || undefined,
      sortColumn: this.sortColumn(),
      sortDirection: this.sortDirection(),
    });
  }

  private fetchCustomers(): void {
    this.selectedGuids.set(new Set());
    this.getCustomerService.loadCustomers({
      pageNumber: this.currentPage(),
      pageSize: this.pageSize,
      searchTerm: this.searchTerm().trim() || undefined,
      sortColumn: this.sortColumn(),
      sortDirection: this.sortDirection(),
    });
  }

  // Customer action methods
  async deactivateCustomer(guid: string): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm(
      'Are you sure you want to deactivate this customer?',
    );
    if (!confirmed) return;
    this.activateCustomerService.deactivateCustomer(guid);
  }

  reactivateCustomer(guid: string): void {
    this.activateCustomerService.reactivateCustomer(guid);
  }

  async deleteCustomer(guid: string): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm(
      'Are you sure you want to permanently delete this customer? This cannot be undone.',
    );
    if (!confirmed) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.deleteCustomerService.deleteCustomer(guid).subscribe({
      next: () => {
        this.deleting.set(false);
        // removeCustomerLocally() (called by DeleteCustomerService) only
        // drops the row from the in-memory page — totalItems/page count
        // would go stale without a real re-fetch of the current page.
        this.fetchCustomers();
      },
      error: (error: HttpErrorResponse) => {
        this.deleting.set(false);
        this.deleteError.set(extractErrorMessage(error));
      },
    });
  }

  isSelected(guid: string): boolean {
    return this.selectedGuids().has(guid);
  }

  toggleSelection(guid: string, checked: boolean): void {
    const next = new Set(this.selectedGuids());
    if (checked) {
      next.add(guid);
    } else {
      next.delete(guid);
    }
    this.selectedGuids.set(next);
  }

  toggleSelectAllOnPage(checked: boolean): void {
    const next = new Set(this.selectedGuids());
    for (const customer of this.customers()) {
      if (checked) {
        next.add(customer.guid);
      } else {
        next.delete(customer.guid);
      }
    }
    this.selectedGuids.set(next);
  }

  // A customer must be Deactivated (or Test, which is exempt from that rule —
  // see Customer_Delete) to be deleted directly; an Active one is only
  // deactivated as part of this action, not deleted, same as the single-row
  // buttons would require.
  async bulkDeleteSelected(): Promise<void> {
    const guids = this.selectedGuids();
    const selected = this.customers().filter((c) => guids.has(c.guid));
    if (selected.length === 0) return;

    const toDeactivate = selected.filter(
      (c) => c.customerStatus === CustomerActivationStatus.Active,
    );
    const toDelete = selected.filter(
      (c) => c.customerStatus !== CustomerActivationStatus.Active,
    );

    const lines = [`Of the ${selected.length} selected customers:`];
    if (toDeactivate.length > 0) {
      lines.push(
        `- ${toDeactivate.length} ${toDeactivate.length === 1 ? 'is' : 'are'} active and will only be deactivated (a customer must be deactivated before it can be deleted).`,
      );
    }
    if (toDelete.length > 0) {
      lines.push(
        `- ${toDelete.length} ${toDelete.length === 1 ? 'is' : 'are'} already deactivated or test customers and will be permanently deleted.`,
      );
    }
    lines.push('Continue?');

    const confirmed = await this.confirmDialogService.confirm(lines.join('\n'));
    if (!confirmed) return;

    this.bulkActionInProgress.set(true);

    const operations = [
      ...toDeactivate.map((c) =>
        this.activateCustomerService.deactivateCustomerSilently(c.guid).pipe(
          map(() => true),
          catchError(() => of(false)),
        ),
      ),
      ...toDelete.map((c) =>
        this.deleteCustomerService.deleteCustomerSilently(c.guid).pipe(
          map(() => true),
          catchError(() => of(false)),
        ),
      ),
    ];

    from(operations)
      .pipe(
        concatMap((operation) => operation),
        toArray(),
      )
      .subscribe((results) => {
        this.bulkActionInProgress.set(false);
        const succeeded = results.filter(Boolean).length;
        const failed = results.length - succeeded;
        this.notificationService.show(
          failed === 0
            ? `Bulk action completed: ${toDeactivate.length} deactivated, ${toDelete.length} deleted.`
            : `Bulk action completed with ${failed} failure(s) (${succeeded} succeeded).`,
          failed === 0 ? 'success' : 'error',
        );
        this.fetchCustomers();
      });
  }
}

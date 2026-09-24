import {
  Component,
  OnInit,
  computed,
  effect,
  signal,
  inject,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, concatMap, from, map, of, toArray } from 'rxjs';
import { CustomerService } from '../../services/customer.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { NotificationService } from '../../services/notification.service';
import { CustomerStatus } from '../../interfaces/customer';
import { extractErrorMessage } from '../../utils/extract-error-message';
import { customerStatusLabel } from '../../utils/customer-status-label';

type CustomerSortColumn = 'name' | 'email' | 'phoneNumber';

const SORT_LABELS: Record<CustomerSortColumn, string> = {
  name: 'name',
  email: 'email',
  phoneNumber: 'phone number',
};

@Component({
  selector: 'app-customer-list',
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.css',
  imports: [RouterLink],
})
export class CustomerListComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);

  readonly customers = this.customerService.customers;
  readonly loading = this.customerService.loading;
  readonly loadError = this.customerService.error;
  readonly activationLoading = this.customerService.activationLoading;
  readonly activationError = this.customerService.activationError;

  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly selectedCustomerIds = signal<ReadonlySet<string>>(new Set());
  readonly bulkActionInProgress = signal(false);

  readonly allSelected = computed(
    () =>
      this.customers().length > 0 &&
      this.customers().every((c) =>
        this.selectedCustomerIds().has(c.customerId),
      ),
  );

  readonly exportLoading = this.customerService.exportLoading;
  readonly exportError = this.customerService.exportError;

  readonly CustomerStatus = CustomerStatus;

  readonly customerStatusLabel = customerStatusLabel;

  readonly searchTerm = signal('');
  readonly sortColumn = signal<CustomerSortColumn>('name');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly pageSize = 50;
  readonly currentPage = signal(1);

  readonly totalItems = this.customerService.totalItems;
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize)),
  );

  readonly resultsAnnouncement = computed(() => {
    if (this.loading()) return 'Loading customers';
    const total = this.totalItems();
    return `${total} ${total === 1 ? 'customer' : 'customers'} found`;
  });

  readonly tableCaption = computed(
    () =>
      `Customers, page ${this.currentPage()} of ${this.totalPages()}, sorted by ${SORT_LABELS[this.sortColumn()]} ${this.sortDirection() === 'asc' ? 'ascending' : 'descending'}`,
  );

  constructor() {
    effect(() => {
      if (this.loading() || this.loadError()) return;
      const lastPage = this.totalPages();
      if (this.currentPage() <= lastPage) return;
      untracked(() => {
        this.currentPage.set(lastPage);
        this.fetchCustomers();
      });
    });
  }

  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private static readonly SEARCH_DEBOUNCE_MS = 300;

  onSearchInput(value: string): void {
    this.searchTerm.set(value);

    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
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

  ariaSort(column: CustomerSortColumn): 'ascending' | 'descending' | 'none' {
    if (this.sortColumn() !== column) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  setSort(column: CustomerSortColumn): void {
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
    this.customerService.exportCustomers({
      searchTerm: this.searchTerm().trim() || undefined,
      sortColumn: this.sortColumn(),
      sortDirection: this.sortDirection(),
    });
  }

  private fetchCustomers(): void {
    this.selectedCustomerIds.set(new Set());
    this.customerService.loadCustomers({
      pageNumber: this.currentPage(),
      pageSize: this.pageSize,
      searchTerm: this.searchTerm().trim() || undefined,
      sortColumn: this.sortColumn(),
      sortDirection: this.sortDirection(),
    });
  }

  async deactivateCustomer(customerId: string): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm(
      'Are you sure you want to deactivate this customer?',
      { title: 'Deactivate customer?', confirmLabel: 'Deactivate' },
    );
    if (!confirmed) return;
    this.customerService.deactivateCustomer(customerId);
  }

  reactivateCustomer(customerId: string): void {
    this.customerService.reactivateCustomer(customerId);
  }

  async deleteCustomer(customerId: string): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm(
      'Are you sure you want to permanently delete this customer? This cannot be undone.',
      { title: 'Delete customer?', confirmLabel: 'Delete', variant: 'danger' },
    );
    if (!confirmed) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.customerService.deleteCustomer(customerId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.fetchCustomers();
      },
      error: (error: HttpErrorResponse) => {
        this.deleting.set(false);
        this.deleteError.set(extractErrorMessage(error));
      },
    });
  }

  isSelected(customerId: string): boolean {
    return this.selectedCustomerIds().has(customerId);
  }

  toggleSelection(customerId: string, checked: boolean): void {
    const next = new Set(this.selectedCustomerIds());
    if (checked) {
      next.add(customerId);
    } else {
      next.delete(customerId);
    }
    this.selectedCustomerIds.set(next);
  }

  toggleSelectAll(checked: boolean): void {
    const next = new Set(this.selectedCustomerIds());
    for (const customer of this.customers()) {
      if (checked) {
        next.add(customer.customerId);
      } else {
        next.delete(customer.customerId);
      }
    }
    this.selectedCustomerIds.set(next);
  }

  async bulkDeleteSelected(): Promise<void> {
    const customerIds = this.selectedCustomerIds();
    const selected = this.customers().filter((c) =>
      customerIds.has(c.customerId),
    );
    if (selected.length === 0) return;

    const toDeactivate = selected.filter(
      (c) => c.status === CustomerStatus.Active,
    );
    const toDelete = selected.filter((c) => c.status !== CustomerStatus.Active);

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

    const confirmed = await this.confirmDialogService.confirm(
      lines.join('\n'),
      {
        title: 'Apply bulk action?',
        confirmLabel: 'Apply',
        variant: toDelete.length > 0 ? 'danger' : 'default',
      },
    );
    if (!confirmed) return;

    this.bulkActionInProgress.set(true);

    const operations = [
      ...toDeactivate.map((c) =>
        this.customerService.deactivateCustomerSilently(c.customerId).pipe(
          map(() => true),
          catchError(() => of(false)),
        ),
      ),
      ...toDelete.map((c) =>
        this.customerService.deleteCustomerSilently(c.customerId).pipe(
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

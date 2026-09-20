import {
  Component,
  Signal,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { GetCustomerService } from '../../services/get-customer.service';
import { ActivateCustomerService } from '../../services/activate-customer.service';
import { AuditLogService } from '../../services/audit-log.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { DeleteCustomerService } from '../../services/delete-customer.service';
import {
  Customer,
  CustomerActivationStatus,
} from '../../interfaces/customer-response';
import { Router, RouterLink } from '@angular/router';
import { extractErrorMessage } from '../../utils/extract-error-message';

@Component({
  selector: 'app-customer-details',
  templateUrl: './customer-details.component.html',
  styleUrls: ['./customer-details.component.css'],
  imports: [DatePipe, RouterLink],
})
export class CustomerDetailsComponent {
  private readonly getCustomerService = inject(GetCustomerService);
  private readonly activateCustomerService = inject(ActivateCustomerService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly deleteCustomerService = inject(DeleteCustomerService);
  private readonly auditLogService = inject(AuditLogService);
  private readonly router = inject(Router);

  // Bound straight from `?id=` by withComponentInputBinding() in app.config.ts.
  readonly id = input<string>();

  genderMap = new Map<Customer['gender'], string>([
    [0, 'not declared'],
    [1, 'male'],
    [2, 'female'],
  ]);

  statusMap = new Map<Customer['customerStatus'], string>([
    [CustomerActivationStatus.Active, 'Active'],
    [CustomerActivationStatus.Deactivated, 'Deactivated'],
    [CustomerActivationStatus.Test, 'Test'],
  ]);

  readonly customer = this.getCustomerService.selectedCustomerSignal;
  readonly isLoading = this.getCustomerService.loadingSignal;
  readonly errorMessage = this.getCustomerService.errorSignal;

  readonly CustomerStatus = CustomerActivationStatus;

  // Deactivate/reactivate share ActivateCustomerService's loading/error state (it's
  // providedIn: 'root', same instance the customer list uses); delete gets its own,
  // same split as customer-list.component.ts.
  readonly activationLoading = this.activateCustomerService.loadingSignal;
  readonly activationError = this.activateCustomerService.errorSignal;
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly auditLog = this.auditLogService.entriesSignal;
  readonly auditLogLoading = this.auditLogService.loadingSignal;
  readonly auditLogError = this.auditLogService.errorSignal;
  private wasActivationLoading = false;

  customerGender: Signal<string | undefined> = computed(() => {
    const c = this.customer();
    return c && c.gender !== undefined
      ? this.genderMap.get(c.gender)
      : undefined;
  });

  customerStatusLabel: Signal<string | undefined> = computed(() => {
    const c = this.customer();
    return c && c.customerStatus !== undefined
      ? this.statusMap.get(c.customerStatus)
      : undefined;
  });

  // Deactivated customers follow the normal deactivate-then-delete lifecycle;
  // Test customers are fictitious data and are exempt from that guardrail
  // (see usp_deleteCustomer), so they can be deleted straight away too.
  canDelete: Signal<boolean> = computed(() => {
    const status = this.customer()?.customerStatus;
    return (
      status === CustomerActivationStatus.Deactivated ||
      status === CustomerActivationStatus.Test
    );
  });

  constructor() {
    // (Re)load whenever the id in the URL changes; no id means nothing to show.
    effect(() => {
      const id = this.id();
      untracked(() => {
        if (id) {
          this.getCustomerService.getCustomer(id);
          this.auditLogService.loadAuditLog(id);
        } else {
          this.router.navigate(['']);
        }
      });
    });

    // The rest of the page (e.g. Account Status) updates live via
    // updateCustomerLocally() as soon as a deactivate/reactivate call
    // resolves; the audit trail can only be refreshed by re-fetching, so
    // this re-loads it whenever activationLoading() flips back to false.
    effect(() => {
      const isLoading = this.activationLoading();
      if (this.wasActivationLoading && !isLoading) {
        const guid = this.customer()?.guid;
        if (guid) this.auditLogService.loadAuditLog(guid);
      }
      this.wasActivationLoading = isLoading;
    });
  }

  async deactivateCustomer(): Promise<void> {
    const guid = this.customer()?.guid;
    if (!guid) return;
    const confirmed = await this.confirmDialogService.confirm(
      'Are you sure you want to deactivate this customer?',
    );
    if (!confirmed) return;
    this.activateCustomerService.deactivateCustomer(guid);
  }

  reactivateCustomer(): void {
    const guid = this.customer()?.guid;
    if (!guid) return;
    this.activateCustomerService.reactivateCustomer(guid);
  }

  async deleteCustomer(): Promise<void> {
    const guid = this.customer()?.guid;
    if (!guid) return;
    const confirmed = await this.confirmDialogService.confirm(
      'Are you sure you want to permanently delete this customer? This cannot be undone.',
    );
    if (!confirmed) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.deleteCustomerService.deleteCustomer(guid).subscribe({
      next: () => this.router.navigate(['/customers']),
      error: (error: HttpErrorResponse) => {
        this.deleting.set(false);
        this.deleteError.set(extractErrorMessage(error));
      },
    });
  }
}

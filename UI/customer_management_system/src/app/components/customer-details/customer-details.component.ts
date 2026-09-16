import {
  Component,
  Signal,
  computed,
  effect,
  signal,
  OnInit,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { GetCustomerService } from '../../../../src/app/services/get-customer.service';
import { ActivateCustomerService } from '../../services/activate-customer.service';
import { AuditLogService } from '../../services/audit-log.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { DeleteCustomerService } from '../../services/delete-customer.service';
import {
  Customer,
  CustomerActivationStatus,
} from '../../interfaces/customer-response';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-customer-details',
  templateUrl: './customer-details.component.html',
  styleUrls: ['./customer-details.component.css'],
  imports: [DatePipe],
})
export class CustomerDetailsComponent implements OnInit {
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

  readonly customer;
  readonly isLoading;
  readonly errorMessage;
  customerGender: Signal<string | undefined>;
  customerStatusLabel: Signal<string | undefined>;
  canDelete: Signal<boolean>;

  readonly CustomerStatus = CustomerActivationStatus;

  // Deactivate/reactivate share ActivateCustomerService's loading/error state (it's
  // providedIn: 'root', same instance the customer list uses); delete gets its own,
  // same split as customer-list.component.ts.
  readonly activationLoading;
  readonly activationError;
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly auditLog;
  readonly auditLogLoading;
  readonly auditLogError;
  private wasActivationLoading = false;

  constructor(
    private getCustomerService: GetCustomerService,
    private activateCustomerService: ActivateCustomerService,
    private confirmDialogService: ConfirmDialogService,
    private deleteCustomerService: DeleteCustomerService,
    private auditLogService: AuditLogService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {
    this.customer = this.getCustomerService.selectedCustomerSignal;
    this.isLoading = this.getCustomerService.loadingSignal;
    this.errorMessage = this.getCustomerService.errorSignal;
    this.activationLoading = this.activateCustomerService.loadingSignal;
    this.activationError = this.activateCustomerService.errorSignal;
    this.auditLog = this.auditLogService.entriesSignal;
    this.auditLogLoading = this.auditLogService.loadingSignal;
    this.auditLogError = this.auditLogService.errorSignal;

    this.customerGender = computed(() => {
      const c = this.customer();
      return c && c.gender !== undefined
        ? this.genderMap.get(c.gender)
        : undefined;
    });

    this.customerStatusLabel = computed(() => {
      const c = this.customer();
      return c && c.customerStatus !== undefined
        ? this.statusMap.get(c.customerStatus)
        : undefined;
    });

    // Deactivated customers follow the normal deactivate-then-delete lifecycle;
    // Test customers are fictitious data and are exempt from that guardrail
    // (see usp_deleteCustomer), so they can be deleted straight away too.
    this.canDelete = computed(() => {
      const status = this.customer()?.customerStatus;
      return (
        status === CustomerActivationStatus.Deactivated ||
        status === CustomerActivationStatus.Test
      );
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

  ngOnInit(): void {
    this.activatedRoute.queryParamMap.subscribe((params) => {
      const paramID = params.get('id');
      if (paramID) {
        this.getCustomerService.getCustomer(paramID);
        this.auditLogService.loadAuditLog(paramID);
      } else {
        this.router.navigate(['']);
      }
    });
  }

  navigateToEdit(): void {
    const guid = this.customer()?.guid;
    if (!guid) return;
    this.router.navigate(['/editCustomer'], { queryParams: { id: guid } });
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
        this.deleteError.set(this.extractErrorMessage(error));
      },
    });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Could not reach the server. It may be offline, or your browser does not trust its security certificate.';
    }
    return (
      error.error?.responseMessage ??
      error.error?.message ??
      `Request failed (${error.status}). Please try again.`
    );
  }
}

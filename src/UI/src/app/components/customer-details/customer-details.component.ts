import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField, disabled, form } from '@angular/forms/signals';
import { RonPipe } from '../../pipes/ron.pipe';
import { HttpErrorResponse } from '@angular/common/http';
import { CustomerService } from '../../services/customer.service';
import { AuditLogService } from '../../services/audit-log.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ProductService } from '../../services/product.service';
import { PurchaseService } from '../../services/purchase.service';
import { Product } from '../../interfaces/product';
import { CustomerStatus, Gender } from '../../interfaces/customer';
import { Router, RouterLink } from '@angular/router';
import { extractErrorMessage } from '../../utils/extract-error-message';
import { auditActionLabel } from '../../utils/audit-action-label';
import { customerStatusLabel } from '../../utils/customer-status-label';

const AUDIT_LOG_PREVIEW_SIZE = 10;

const GENDER_LABELS = new Map<Gender, string>([
  [Gender.NotDeclared, 'not declared'],
  [Gender.Male, 'male'],
  [Gender.Female, 'female'],
]);

@Component({
  selector: 'app-customer-details',
  templateUrl: './customer-details.component.html',
  styleUrl: './customer-details.component.css',
  imports: [DatePipe, FormField, RonPipe, RouterLink],
})
export class CustomerDetailsComponent {
  private readonly customerService = inject(CustomerService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly auditLogService = inject(AuditLogService);
  private readonly purchaseService = inject(PurchaseService);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  readonly customerId = input<string>();

  private readonly customerResource = rxResource({
    params: () => this.customerId(),
    stream: ({ params: customerId }) =>
      this.customerService.getCustomer(customerId),
  });
  readonly customer = computed(() =>
    this.customerResource.hasValue() ? this.customerResource.value() : null,
  );
  readonly loading = computed(
    () => this.customerResource.status() === 'loading',
  );
  readonly loadError = computed(() => {
    const error = this.customerResource.error();
    return error
      ? extractErrorMessage(
          error as HttpErrorResponse,
          'Failed to load the customer',
        )
      : null;
  });

  readonly CustomerStatus = CustomerStatus;
  readonly Gender = Gender;

  readonly activationLoading = this.customerService.activationLoading;
  readonly activationError = this.customerService.activationError;
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly auditActionLabel = auditActionLabel;
  readonly auditLog = this.auditLogService.entries;
  readonly auditLogLoading = this.auditLogService.loading;
  readonly auditLogError = this.auditLogService.error;
  // Collapsed again whenever another customer is shown.
  readonly showAllAuditLog = linkedSignal({
    source: this.customerId,
    computation: () => false,
  });
  readonly visibleAuditLog = computed(() =>
    this.showAllAuditLog()
      ? this.auditLog()
      : this.auditLog().slice(0, AUDIT_LOG_PREVIEW_SIZE),
  );
  readonly hiddenAuditLogCount = computed(
    () => this.auditLog().length - this.visibleAuditLog().length,
  );

  readonly purchases = this.purchaseService.entries;
  readonly purchasesLoading = this.purchaseService.loading;
  readonly purchasesError = this.purchaseService.error;

  readonly totalSpent = computed(
    () =>
      this.purchases().reduce(
        (cents, p) => cents + Math.round(p.price * 100),
        0,
      ) / 100,
  );

  readonly products = this.productService.products;
  readonly productsLoading = this.productService.loading;
  readonly productsError = this.productService.error;

  private readonly purchaseModel = signal({ productId: '' });
  readonly selectedProductId = computed(() => this.purchaseModel().productId);
  readonly purchasing = signal(false);
  readonly purchaseError = signal<string | null>(null);

  readonly genderLabel = computed(() => {
    const customer = this.customer();
    return customer ? GENDER_LABELS.get(customer.gender) : undefined;
  });

  readonly statusLabel = computed(() => {
    const customer = this.customer();
    return customer ? customerStatusLabel(customer.status) : undefined;
  });

  readonly canDelete = computed(() => {
    const status = this.customer()?.status;
    return (
      status === CustomerStatus.Deactivated || status === CustomerStatus.Test
    );
  });

  readonly canPurchase = computed(() => {
    const status = this.customer()?.status;
    return status !== undefined && status !== CustomerStatus.Deactivated;
  });

  readonly productGroups = computed(() => {
    const groups = new Map<string, Product[]>();
    for (const product of this.products()) {
      const group = groups.get(product.category);
      if (group) group.push(product);
      else groups.set(product.category, [product]);
    }
    return [...groups].map(([category, products]) => ({ category, products }));
  });

  readonly selectedProduct = computed(() =>
    this.products().find((p) => p.productId === this.selectedProductId()),
  );

  readonly canSubmitPurchase = computed(() => {
    const product = this.selectedProduct();
    return (
      this.canPurchase() &&
      !this.purchasing() &&
      product !== undefined &&
      product.quantityOnHand > 0
    );
  });

  readonly purchaseForm = form(this.purchaseModel, (p) => {
    disabled(
      p.productId,
      () =>
        !this.canPurchase() ||
        this.purchasing() ||
        this.productsLoading() ||
        !!this.productsError(),
    );
  });

  constructor() {
    this.productService.loadProducts();
    this.auditLogService.bindAuditLog(this.customerId);
    this.purchaseService.bindPurchases(this.customerId);
  }

  async deactivateCustomer(): Promise<void> {
    const customerId = this.customer()?.customerId;
    if (!customerId) return;
    const confirmed = await this.confirmDialogService.confirm(
      'Are you sure you want to deactivate this customer?',
      { title: 'Deactivate customer?', confirmLabel: 'Deactivate' },
    );
    if (!confirmed) return;
    if (await this.customerService.deactivateCustomer(customerId))
      this.refreshAfterStatusChange();
  }

  async reactivateCustomer(): Promise<void> {
    const customerId = this.customer()?.customerId;
    if (!customerId) return;
    if (await this.customerService.reactivateCustomer(customerId))
      this.refreshAfterStatusChange();
  }

  private refreshAfterStatusChange(): void {
    this.customerResource.reload();
    this.auditLogService.reloadAuditLog();
  }

  recordPurchase(): void {
    const customerId = this.customer()?.customerId;
    const productId = this.selectedProductId();
    if (!customerId || !productId || !this.canSubmitPurchase()) return;

    this.purchasing.set(true);
    this.purchaseError.set(null);

    this.purchaseService.purchaseProduct(customerId, productId).subscribe({
      next: () => {
        this.purchasing.set(false);
        this.purchaseForm.productId().value.set('');
        this.purchaseService.reloadPurchases();
        this.productService.loadProducts();
        this.auditLogService.reloadAuditLog();
      },
      error: (error: HttpErrorResponse) => {
        this.purchasing.set(false);
        this.purchaseError.set(extractErrorMessage(error));
        this.productService.loadProducts();
      },
    });
  }

  async deleteCustomer(): Promise<void> {
    const customerId = this.customer()?.customerId;
    if (!customerId) return;
    const confirmed = await this.confirmDialogService.confirm(
      'Are you sure you want to permanently delete this customer? This cannot be undone.',
      { title: 'Delete customer?', confirmLabel: 'Delete', variant: 'danger' },
    );
    if (!confirmed) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.customerService.deleteCustomer(customerId).subscribe({
      next: () => this.router.navigate(['/customers']),
      error: (error: HttpErrorResponse) => {
        this.deleting.set(false);
        this.deleteError.set(extractErrorMessage(error));
      },
    });
  }
}

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

@Component({
  selector: 'app-customer-details',
  templateUrl: './customer-details.component.html',
  styleUrl: './customer-details.component.css',
  imports: [DatePipe, RonPipe, RouterLink],
})
export class CustomerDetailsComponent {
  private readonly customerService = inject(CustomerService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly auditLogService = inject(AuditLogService);
  private readonly purchaseService = inject(PurchaseService);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  // Bound from the `:customerId` route param by withComponentInputBinding() in app.config.ts.
  readonly customerId = input<string>();

  genderMap = new Map<Gender, string>([
    [Gender.NotDeclared, 'not declared'],
    [Gender.Male, 'male'],
    [Gender.Female, 'female'],
  ]);

  statusMap = new Map<CustomerStatus, string>([
    [CustomerStatus.Active, 'Active'],
    [CustomerStatus.Deactivated, 'Deactivated'],
    [CustomerStatus.Test, 'Test'],
  ]);

  readonly customer = this.customerService.selectedCustomer;
  readonly isLoading = this.customerService.loading;
  readonly errorMessage = this.customerService.error;

  readonly CustomerStatus = CustomerStatus;
  readonly Gender = Gender;

  // Deactivate/reactivate share CustomerService's loading/error state (it's
  // providedIn: 'root', same instance the customer list uses); delete gets its own,
  // same split as customer-list.component.ts.
  readonly activationLoading = this.customerService.activationLoading;
  readonly activationError = this.customerService.activationError;
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly auditActionLabel = auditActionLabel;
  readonly auditLog = this.auditLogService.entries;
  readonly auditLogLoading = this.auditLogService.loading;
  readonly auditLogError = this.auditLogService.error;
  private wasActivationLoading = false;

  readonly purchases = this.purchaseService.entries;
  readonly purchasesLoading = this.purchaseService.loading;
  readonly purchasesError = this.purchaseService.error;

  // Sum of the listed purchases' prices. Added up in whole cents so 0.1 + 0.2 style
  // float drift never shows on screen (prices are DECIMAL(12,2) in the DB).
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

  // Which product is picked in the "Record purchase" <select> ('' = none yet).
  readonly selectedProductId = signal('');
  readonly purchasing = signal(false);
  readonly purchaseError = signal<string | null>(null);

  customerGender: Signal<string | undefined> = computed(() => {
    const c = this.customer();
    return c && c.gender !== undefined
      ? this.genderMap.get(c.gender)
      : undefined;
  });

  customerStatusLabel: Signal<string | undefined> = computed(() => {
    const c = this.customer();
    return c && c.status !== undefined
      ? this.statusMap.get(c.status)
      : undefined;
  });

  // Deactivated customers follow the normal deactivate-then-delete lifecycle;
  // Test customers are fictitious data and are exempt from that guardrail
  // (see Customer_Delete), so they can be deleted straight away too.
  canDelete: Signal<boolean> = computed(() => {
    const status = this.customer()?.status;
    return (
      status === CustomerStatus.Deactivated || status === CustomerStatus.Test
    );
  });

  // Same rule as CustomerPurchase_Create: everything but a deactivated customer may buy.
  canPurchase: Signal<boolean> = computed(() => {
    const status = this.customer()?.status;
    return status !== undefined && status !== CustomerStatus.Deactivated;
  });

  // The catalogue grouped by category (the API already returns it category-ordered),
  // for <optgroup>s — 50 flat options would be a long list to scan.
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

  constructor() {
    // The catalogue is the same for every customer, so it's fetched once per visit
    // to this page rather than per id.
    this.productService.loadProducts();

    // (Re)load whenever the id in the URL changes; no id means nothing to show.
    effect(() => {
      const id = this.customerId();
      untracked(() => {
        if (id) {
          this.customerService.getCustomer(id);
          this.auditLogService.loadAuditLog(id);
          this.purchaseService.loadPurchases(id);
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
        const customerId = this.customer()?.customerId;
        if (customerId) this.auditLogService.loadAuditLog(customerId);
      }
      this.wasActivationLoading = isLoading;
    });
  }

  async deactivateCustomer(): Promise<void> {
    const customerId = this.customer()?.customerId;
    if (!customerId) return;
    const confirmed = await this.confirmDialogService.confirm(
      'Are you sure you want to deactivate this customer?',
      { title: 'Deactivate customer?', confirmLabel: 'Deactivate' },
    );
    if (!confirmed) return;
    this.customerService.deactivateCustomer(customerId);
  }

  reactivateCustomer(): void {
    const customerId = this.customer()?.customerId;
    if (!customerId) return;
    this.customerService.reactivateCustomer(customerId);
  }

  selectProduct(event: Event): void {
    this.selectedProductId.set((event.target as HTMLSelectElement).value);
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
        this.selectedProductId.set('');
        // A purchase changes three things on this page: the history, the product's
        // stock (shown in the <select>) and the audit trail (a "Purchased" entry).
        this.purchaseService.loadPurchases(customerId);
        this.productService.loadProducts();
        this.auditLogService.loadAuditLog(customerId);
      },
      error: (error: HttpErrorResponse) => {
        this.purchasing.set(false);
        this.purchaseError.set(extractErrorMessage(error));
        // e.g. "out of stock" — the list the user picked from is now stale.
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

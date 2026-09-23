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
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { GetCustomerService } from '../../services/get-customer.service';
import { ActivateCustomerService } from '../../services/activate-customer.service';
import { AuditLogService } from '../../services/audit-log.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { DeleteCustomerService } from '../../services/delete-customer.service';
import { ProductService } from '../../services/product.service';
import { PurchaseService } from '../../services/purchase.service';
import { Product } from '../../interfaces/product';
import {
  CustomerActivationStatus,
  Gender,
} from '../../interfaces/customer-response';
import { Router, RouterLink } from '@angular/router';
import { extractErrorMessage } from '../../utils/extract-error-message';

@Component({
  selector: 'app-customer-details',
  templateUrl: './customer-details.component.html',
  styleUrls: ['./customer-details.component.css'],
  imports: [DatePipe, DecimalPipe, RouterLink],
})
export class CustomerDetailsComponent {
  private readonly getCustomerService = inject(GetCustomerService);
  private readonly activateCustomerService = inject(ActivateCustomerService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly deleteCustomerService = inject(DeleteCustomerService);
  private readonly auditLogService = inject(AuditLogService);
  private readonly purchaseService = inject(PurchaseService);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  // Bound straight from `?id=` by withComponentInputBinding() in app.config.ts.
  readonly id = input<string>();

  genderMap = new Map<Gender, string>([
    [Gender.NotDeclared, 'not declared'],
    [Gender.Male, 'male'],
    [Gender.Female, 'female'],
  ]);

  statusMap = new Map<CustomerActivationStatus, string>([
    [CustomerActivationStatus.Active, 'Active'],
    [CustomerActivationStatus.Deactivated, 'Deactivated'],
    [CustomerActivationStatus.Test, 'Test'],
  ]);

  readonly customer = this.getCustomerService.selectedCustomerSignal;
  readonly isLoading = this.getCustomerService.loadingSignal;
  readonly errorMessage = this.getCustomerService.errorSignal;

  readonly CustomerStatus = CustomerActivationStatus;
  readonly Gender = Gender;

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

  readonly purchases = this.purchaseService.entriesSignal;
  readonly purchasesLoading = this.purchaseService.loadingSignal;
  readonly purchasesError = this.purchaseService.errorSignal;

  // Sum of the listed purchases' prices. Added up in whole cents so 0.1 + 0.2 style
  // float drift never shows on screen (prices are DECIMAL(10,2) in the DB).
  readonly totalSpent = computed(
    () => this.purchases().reduce((cents, p) => cents + Math.round(p.price * 100), 0) / 100,
  );

  readonly products = this.productService.productsSignal;
  readonly productsLoading = this.productService.loadingSignal;
  readonly productsError = this.productService.errorSignal;

  // Which product is picked in the "Record purchase" <select> ('' = none yet).
  readonly selectedProductGuid = signal('');
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

  // Same rule as usp_purchaseProduct: everything but a deactivated customer may buy.
  canPurchase: Signal<boolean> = computed(() => {
    const status = this.customer()?.customerStatus;
    return status !== undefined && status !== CustomerActivationStatus.Deactivated;
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
    this.products().find((p) => p.guid === this.selectedProductGuid()),
  );

  readonly canSubmitPurchase = computed(() => {
    const product = this.selectedProduct();
    return (
      this.canPurchase() &&
      !this.purchasing() &&
      product !== undefined &&
      product.stockQuantity > 0
    );
  });

  constructor() {
    // The catalogue is the same for every customer, so it's fetched once per visit
    // to this page rather than per id.
    this.productService.loadProducts();

    // (Re)load whenever the id in the URL changes; no id means nothing to show.
    effect(() => {
      const id = this.id();
      untracked(() => {
        if (id) {
          this.getCustomerService.getCustomer(id);
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

  selectProduct(event: Event): void {
    this.selectedProductGuid.set((event.target as HTMLSelectElement).value);
  }

  recordPurchase(): void {
    const customerGuid = this.customer()?.guid;
    const productGuid = this.selectedProductGuid();
    if (!customerGuid || !productGuid || !this.canSubmitPurchase()) return;

    this.purchasing.set(true);
    this.purchaseError.set(null);

    this.purchaseService.purchaseProduct(customerGuid, productGuid).subscribe({
      next: () => {
        this.purchasing.set(false);
        this.selectedProductGuid.set('');
        // A purchase changes three things on this page: the history, the product's
        // stock (shown in the <select>) and the audit trail (a "Purchased" entry).
        this.purchaseService.loadPurchases(customerGuid);
        this.productService.loadProducts();
        this.auditLogService.loadAuditLog(customerGuid);
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

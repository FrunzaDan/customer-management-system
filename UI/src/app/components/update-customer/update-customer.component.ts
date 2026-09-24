import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormRoot, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CustomerService } from '../../services/customer.service';
import { extractErrorMessage } from '../../utils/extract-error-message';
import {
  customerFormSchema,
  emptyCustomerForm,
  isCustomerFormDirty,
  applyFormModel,
  toFormModel,
} from '../customer-form-fields/customer-form';
import { CustomerFormFieldsComponent } from '../customer-form-fields/customer-form-fields.component';

@Component({
  selector: 'app-update-customer',
  templateUrl: './update-customer.component.html',
  styleUrl: './update-customer.component.css',
  imports: [CustomerFormFieldsComponent, FormRoot, RouterLink],
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class UpdateCustomerComponent {
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);

  readonly customerId = input<string>();

  private readonly customerResource = rxResource({
    params: () => this.customerId(),
    stream: ({ params: customerId }) =>
      this.customerService.getCustomer(customerId),
  });
  readonly customer = computed(() =>
    this.customerResource.hasValue() ? this.customerResource.value() : null,
  );
  readonly loading = this.customerResource.isLoading;
  readonly loadError = computed(() => {
    const error = this.customerResource.error();
    return error
      ? extractErrorMessage(
          error as HttpErrorResponse,
          'Failed to load the customer',
        )
      : null;
  });

  private readonly baseline = computed(() => {
    const customer = this.customer();
    return customer ? toFormModel(customer) : emptyCustomerForm();
  });
  readonly model = linkedSignal(() => this.baseline());

  private readonly saved = signal(false);

  readonly hasUnsavedChanges = computed(
    () => !this.saved() && isCustomerFormDirty(this.model(), this.baseline()),
  );

  readonly saveError = signal<string | null>(null);
  readonly invalidSummary = signal<string | null>(null);

  readonly customerForm = form(this.model, customerFormSchema, {
    submission: {
      action: () => this.save(),
      onInvalid: (field) => {
        const errors = field().errorSummary();
        this.invalidSummary.set(
          `The form has ${errors.length} ${errors.length === 1 ? 'error' : 'errors'}. Please correct the highlighted fields.`,
        );
        errors[0]?.fieldTree().focusBoundControl();
      },
    },
  });

  private async save(): Promise<void> {
    const current = this.customer();
    if (!current) return;

    this.saveError.set(null);
    this.invalidSummary.set(null);

    try {
      await firstValueFrom(
        this.customerService.updateCustomer(
          applyFormModel(this.model(), current),
        ),
      );
      this.saved.set(true);
      await this.router.navigate(['/customers']);
    } catch (error) {
      this.saveError.set(
        extractErrorMessage(
          error as HttpErrorResponse,
          'Failed to save changes',
        ),
      );
    }
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }
}

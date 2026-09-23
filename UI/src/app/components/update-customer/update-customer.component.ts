import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormRoot, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UpdateCustomerService } from '../../services/update-customer.service';
import { GetCustomerService } from '../../services/get-customer.service';
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
  selector: 'app-edit-customer',
  templateUrl: './update-customer.component.html',
  styleUrl: './update-customer.component.css',
  imports: [CustomerFormFieldsComponent, FormRoot, RouterLink],
  // Refresh / closing the tab isn't a router navigation, so guard it here too.
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class UpdateCustomerComponent {
  private readonly router = inject(Router);
  private readonly getCustomerService = inject(GetCustomerService);
  private readonly updateCustomerService = inject(UpdateCustomerService);

  // Bound straight from `?id=` by withComponentInputBinding() in app.config.ts.
  readonly id = input<string>();

  readonly customer = this.getCustomerService.selectedCustomer;
  readonly isLoading = this.getCustomerService.loading;
  readonly errorMessage = this.getCustomerService.error;

  // The form model *is* the loaded customer, mapped: it re-derives whenever
  // customer() changes and stays writable for the user's edits — no effect +
  // patchValue copy step.
  private readonly baseline = computed(() => {
    const customer = this.customer();
    return customer ? toFormModel(customer) : emptyCustomerForm();
  });
  readonly model = linkedSignal(() => this.baseline());

  private readonly saved = signal(false);

  // Read by unsavedChangesGuard: edits that differ from the loaded customer and
  // haven't been saved. Putting a value back to the original clears it.
  readonly hasUnsavedChanges = computed(
    () => !this.saved() && isCustomerFormDirty(this.model(), this.baseline()),
  );

  // Distinct from isLoading/errorMessage above, which reflect fetching the
  // customer being edited — these track the save (PATCH) request itself.
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

  constructor() {
    effect(() => {
      const id = this.id();
      if (id) untracked(() => this.getCustomerService.getCustomer(id));
    });
  }

  private async save(): Promise<void> {
    const current = this.customer();
    if (!current) return;

    this.saveError.set(null);
    this.invalidSummary.set(null);

    try {
      await firstValueFrom(
        this.updateCustomerService.updateCustomer(applyFormModel(this.model(), current)),
      );
      // Saved — leaving now must not trigger the unsaved-changes prompt.
      this.saved.set(true);
      await this.router.navigate(['/customers']);
    } catch (error) {
      this.saveError.set(
        extractErrorMessage(error as HttpErrorResponse, 'Failed to save changes'),
      );
    }
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }
}

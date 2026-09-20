import {
  Component,
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
import { EditCustomerService } from '../../services/edit-customer.service';
import { GetCustomerService } from '../../services/get-customer.service';
import { extractErrorMessage } from '../../utils/extract-error-message';
import {
  customerFormSchema,
  emptyCustomerForm,
  toCustomer,
  toFormModel,
} from '../customer-form-fields/customer-form';
import { CustomerFormFieldsComponent } from '../customer-form-fields/customer-form-fields.component';

@Component({
  selector: 'app-edit-customer',
  templateUrl: './edit-customer.component.html',
  styleUrls: ['./edit-customer.component.css'],
  imports: [CustomerFormFieldsComponent, FormRoot, RouterLink],
})
export class EditCustomerComponent {
  private readonly router = inject(Router);
  private readonly getCustomerService = inject(GetCustomerService);
  private readonly editCustomerService = inject(EditCustomerService);

  // Bound straight from `?id=` by withComponentInputBinding() in app.config.ts.
  readonly id = input<string>();

  readonly customer = this.getCustomerService.selectedCustomerSignal;
  readonly isLoading = this.getCustomerService.loadingSignal;
  readonly errorMessage = this.getCustomerService.errorSignal;

  // The form model *is* the loaded customer, mapped: it re-derives whenever
  // customer() changes and stays writable for the user's edits — no effect +
  // patchValue copy step.
  readonly model = linkedSignal(() => {
    const customer = this.customer();
    return customer ? toFormModel(customer) : emptyCustomerForm();
  });

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
        this.editCustomerService.editCustomer(toCustomer(this.model(), current)),
      );
      await this.router.navigate(['/customers']);
    } catch (error) {
      this.saveError.set(
        extractErrorMessage(error as HttpErrorResponse, 'Failed to save changes'),
      );
    }
  }
}

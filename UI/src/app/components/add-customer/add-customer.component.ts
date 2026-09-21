import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormRoot, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AddCustomerService } from '../../services/add-customer.service';
import { extractErrorMessage } from '../../utils/extract-error-message';
import {
  CustomerFormModel,
  customerFormSchema,
  emptyCustomerForm,
  isCustomerFormDirty,
  toCustomer,
} from '../customer-form-fields/customer-form';
import { CustomerFormFieldsComponent } from '../customer-form-fields/customer-form-fields.component';

@Component({
  selector: 'app-add-customer',
  templateUrl: './add-customer.component.html',
  styleUrls: ['./add-customer.component.css'],
  imports: [CustomerFormFieldsComponent, FormRoot, RouterLink],
  // Refresh / closing the tab isn't a router navigation, so guard it here too.
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class AddCustomerComponent {
  private readonly router = inject(Router);
  private readonly addCustomerService = inject(AddCustomerService);

  readonly model = signal<CustomerFormModel>(emptyCustomerForm());
  private readonly saved = signal(false);

  // Read by unsavedChangesGuard: anything typed, and not yet saved.
  readonly hasUnsavedChanges = computed(
    () => !this.saved() && isCustomerFormDirty(this.model(), emptyCustomerForm()),
  );
  readonly errorMessage = signal<string | null>(null);
  readonly invalidSummary = signal<string | null>(null);

  readonly customerForm = form(this.model, customerFormSchema, {
    submission: {
      action: () => this.save(),
      onInvalid: (field) => {
        const errors = field().errorSummary();
        this.invalidSummary.set(
          `The form has ${errors.length} ${errors.length === 1 ? 'error' : 'errors'}. Please correct the highlighted fields.`,
        );
        // Move focus to the first problem so keyboard/screen-reader users land on it.
        errors[0]?.fieldTree().focusBoundControl();
      },
    },
  });

  // Runs only when the form is valid (FormRoot -> submit()); the form's own
  // submitting() state replaces the old hand-rolled `loading` signal.
  private async save(): Promise<void> {
    this.errorMessage.set(null);
    this.invalidSummary.set(null);

    try {
      await firstValueFrom(
        this.addCustomerService.addCustomer(toCustomer(this.model())),
      );
      // Saved — leaving now must not trigger the unsaved-changes prompt.
      this.saved.set(true);
      await this.router.navigate(['/customers']);
    } catch (error) {
      // A 401 (session expired mid-form) is handled globally by authErrorInterceptor.
      this.errorMessage.set(
        extractErrorMessage(error as HttpErrorResponse, 'Failed to add customer'),
      );
    }
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }
}

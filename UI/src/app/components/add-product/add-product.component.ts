import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormRoot, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AddProductService } from '../../services/add-product.service';
import { extractErrorMessage } from '../../utils/extract-error-message';
import {
  ProductFormModel,
  emptyProductForm,
  isProductFormDirty,
  productFormSchema,
  toProduct,
} from './product-form';
import { ProductFormFieldsComponent } from './product-form-fields.component';

@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.css',
  imports: [ProductFormFieldsComponent, FormRoot, RouterLink],
  // Refresh / closing the tab isn't a router navigation, so guard it here too.
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class AddProductComponent {
  private readonly router = inject(Router);
  private readonly addProductService = inject(AddProductService);

  readonly model = signal<ProductFormModel>(emptyProductForm());
  private readonly saved = signal(false);

  // Read by unsavedChangesGuard: anything typed, and not yet saved.
  readonly hasUnsavedChanges = computed(
    () => !this.saved() && isProductFormDirty(this.model(), emptyProductForm()),
  );
  readonly errorMessage = signal<string | null>(null);
  readonly invalidSummary = signal<string | null>(null);

  readonly productForm = form(this.model, productFormSchema, {
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
    this.errorMessage.set(null);
    this.invalidSummary.set(null);

    try {
      await firstValueFrom(this.addProductService.addProduct(toProduct(this.model())));
      // Saved — leaving now must not trigger the unsaved-changes prompt.
      this.saved.set(true);
      await this.router.navigate(['/products']);
    } catch (error) {
      // A 401 (session expired mid-form) is handled globally by authErrorInterceptor.
      this.errorMessage.set(
        extractErrorMessage(error as HttpErrorResponse, 'Failed to add product'),
      );
    }
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }
}

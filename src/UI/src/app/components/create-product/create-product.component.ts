import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormRoot, form, TreeValidationResult } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { toServerErrors } from '../../utils/server-errors';
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
  templateUrl: './create-product.component.html',
  styleUrl: './create-product.component.css',
  imports: [ProductFormFieldsComponent, FormRoot, RouterLink],
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class CreateProductComponent {
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);

  readonly model = signal<ProductFormModel>(emptyProductForm());
  private readonly saved = signal(false);

  readonly hasUnsavedChanges = computed(
    () => !this.saved() && isProductFormDirty(this.model(), emptyProductForm()),
  );
  readonly saveError = signal<string | null>(null);
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

  private async save(): Promise<TreeValidationResult> {
    this.saveError.set(null);
    this.invalidSummary.set(null);

    try {
      await firstValueFrom(
        this.productService.createProduct(toProduct(this.model())),
      );
      this.saved.set(true);
      await this.router.navigate(['/products']);
    } catch (error) {
      const { fieldErrors, message } = toServerErrors(
        error as HttpErrorResponse,
        this.productForm,
        'Failed to add product',
      );
      this.saveError.set(message);
      fieldErrors[0]?.fieldTree().focusBoundControl();
      return fieldErrors;
    }
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }
}

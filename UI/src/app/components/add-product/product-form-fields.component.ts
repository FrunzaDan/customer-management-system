import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { ProductFormModel } from './product-form';

@Component({
  selector: 'app-product-form-fields',
  templateUrl: './product-form-fields.component.html',
  imports: [FormField],
})
export class ProductFormFieldsComponent {
  readonly form = input.required<FieldTree<ProductFormModel>>();

  protected readonly textFields = [
    { key: 'name', label: 'Product name' },
    { key: 'category', label: 'Category' },
    { key: 'depot', label: 'Depot' },
  ] as const;
}

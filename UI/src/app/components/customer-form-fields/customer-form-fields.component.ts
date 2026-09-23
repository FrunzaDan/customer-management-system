import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { CustomerFormModel } from './customer-form';

// The two form cards (personal details + address) shared by create-customer and
// update-customer. The parent owns the form and its submission; this only renders.
@Component({
  selector: 'app-customer-form-fields',
  templateUrl: './customer-form-fields.component.html',
  imports: [FormField],
})
export class CustomerFormFieldsComponent {
  readonly form = input.required<FieldTree<CustomerFormModel>>();

  protected readonly basicFields = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phoneNumber', label: 'Phone' },
  ] as const;

  protected readonly addressFields = [
    { key: 'country', label: 'Country' },
    { key: 'county', label: 'County' },
    { key: 'city', label: 'City' },
    { key: 'street', label: 'Street' },
    { key: 'streetNumber', label: 'Street number' },
    { key: 'postalCode', label: 'Postal code' },
  ] as const;
}

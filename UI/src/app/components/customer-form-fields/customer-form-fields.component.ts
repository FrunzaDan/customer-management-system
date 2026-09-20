import { Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { CustomerFormModel } from './customer-form';

// The two form cards (personal details + address) shared by add-customer and
// edit-customer. The parent owns the form and its submission; this only renders.
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
    { key: 'msisdn', label: 'Phone' },
  ] as const;

  protected readonly addressFields = [
    { key: 'country', label: 'Country' },
    { key: 'county', label: 'County' },
    { key: 'town', label: 'Town' },
    { key: 'street', label: 'Street' },
    { key: 'number', label: 'Number' },
    { key: 'zip', label: 'Zip' },
  ] as const;
}

import { pattern, required, schema } from '@angular/forms/signals';
import { environment } from '../../../environments/environment';
import {
  CreateCustomerRequest,
  Customer,
  Gender,
} from '../../interfaces/customer';

// Shared by create-customer and update-customer: one model shape, one validation
// schema, and the two-way mapping between the form and the API's Customer.
export interface CustomerFormModel {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: string; // <select> emits strings; the API wants a Gender number (see toCreateCustomerRequest)
  birthDate: string;
  country: string;
  county: string;
  city: string;
  street: string;
  streetNumber: string;
  postalCode: string;
}

export const emptyCustomerForm = (): CustomerFormModel => ({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  gender: '',
  birthDate: '',
  country: '',
  county: '',
  city: '',
  street: '',
  streetNumber: '',
  postalCode: '',
});

export const customerFormSchema = schema<CustomerFormModel>((p) => {
  required(p.firstName, { message: 'First name is required' });
  required(p.lastName, { message: 'Last name is required' });
  required(p.email, { message: 'Email is required' });
  pattern(p.email, new RegExp(environment.emailRegex), {
    message: 'The email should be a valid one',
  });
  required(p.phoneNumber, { message: 'Phone number is required' });
  pattern(p.phoneNumber, new RegExp(environment.phoneNumberRegex), {
    message: 'The phone number should be a valid one',
  });
  required(p.gender, { message: 'Gender is required' });
  required(p.birthDate, { message: 'Birth date is required' });
  required(p.country, { message: 'Country is required' });
  required(p.county, { message: 'County is required' });
  required(p.city, { message: 'City is required' });
  required(p.street, { message: 'Street is required' });
  required(p.streetNumber, { message: 'Street number is required' });
  required(p.postalCode, { message: 'Postal code is required' });
});

export function toFormModel(customer: Customer): CustomerFormModel {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phoneNumber: customer.phoneNumber,
    gender: customer.gender.toString(),
    // Already "YYYY-MM-DD" — the DB column is a real DATE — which is exactly what
    // <input type="date"> needs to pre-fill.
    birthDate: customer.birthDate ?? '',
    country: customer.address.country,
    county: customer.address.county,
    city: customer.address.city,
    street: customer.address.street,
    streetNumber: customer.address.streetNumber,
    postalCode: customer.address.postalCode,
  };
}

export function toCreateCustomerRequest(
  model: CustomerFormModel,
): CreateCustomerRequest {
  return {
    firstName: model.firstName,
    lastName: model.lastName,
    email: model.email,
    phoneNumber: model.phoneNumber,
    gender: Number(model.gender) as Gender,
    birthDate: model.birthDate || undefined,
    address: {
      country: model.country,
      county: model.county,
      city: model.city,
      street: model.street,
      streetNumber: model.streetNumber,
      postalCode: model.postalCode,
    },
  };
}

// The loaded customer with the form's values applied — what the edit page saves, and what
// the local customer list is updated to once the save succeeds. Server-owned fields (customerId,
// status, dates) come from `current` unchanged.
export function applyFormModel(
  model: CustomerFormModel,
  current: Customer,
): Customer {
  return { ...current, ...toCreateCustomerRequest(model) };
}

// True when the user has changed anything relative to `baseline` (the blank
// form when adding, the loaded customer when editing). Comparing values —
// rather than trusting a "touched" flag — means typing something and then
// putting it back doesn't count as an unsaved change.
export function isCustomerFormDirty(
  model: CustomerFormModel,
  baseline: CustomerFormModel,
): boolean {
  return (Object.keys(model) as (keyof CustomerFormModel)[]).some(
    (key) => model[key] !== baseline[key],
  );
}

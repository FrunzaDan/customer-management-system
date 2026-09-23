import { pattern, required, schema } from '@angular/forms/signals';
import { environment } from '../../../environments/environment';
import {
  CreateCustomerRequest,
  Customer,
  Gender,
} from '../../interfaces/customer-response';

// Shared by add-customer and edit-customer: one model shape, one validation
// schema, and the two-way mapping between the form and the API's Customer.
export interface CustomerFormModel {
  firstName: string;
  lastName: string;
  email: string;
  msisdn: string;
  gender: string; // <select> emits strings; the API wants a Gender number (see toCreateCustomerRequest)
  birthdate: string;
  country: string;
  county: string;
  town: string;
  street: string;
  number: string;
  zip: string;
}

export const emptyCustomerForm = (): CustomerFormModel => ({
  firstName: '',
  lastName: '',
  email: '',
  msisdn: '',
  gender: '',
  birthdate: '',
  country: '',
  county: '',
  town: '',
  street: '',
  number: '',
  zip: '',
});

export const customerFormSchema = schema<CustomerFormModel>((p) => {
  required(p.firstName, { message: 'First Name is required' });
  required(p.lastName, { message: 'Last Name is required' });
  required(p.email, { message: 'Email is required' });
  pattern(p.email, new RegExp(environment.EmailRegex), {
    message: 'The Email should be a valid one',
  });
  required(p.msisdn, { message: 'Phone Number is required' });
  pattern(p.msisdn, new RegExp(environment.PhoneRegex), {
    message: 'The phone number should be a valid one',
  });
  required(p.gender, { message: 'Gender is required' });
  required(p.birthdate, { message: 'Birthdate is required' });
  required(p.country, { message: 'Country is required' });
  required(p.county, { message: 'County is required' });
  required(p.town, { message: 'Town is required' });
  required(p.street, { message: 'Street is required' });
  required(p.number, { message: 'Street number is required' });
  required(p.zip, { message: 'Zip code is required' });
});

export function toFormModel(customer: Customer): CustomerFormModel {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    msisdn: customer.msisdn,
    gender: customer.gender.toString(),
    // Already "YYYY-MM-DD" — the DB column is a real DATE — which is exactly what
    // <input type="date"> needs to pre-fill.
    birthdate: customer.birthdate ?? '',
    country: customer.address.country,
    county: customer.address.county,
    town: customer.address.town,
    street: customer.address.street,
    number: customer.address.number,
    zip: customer.address.zip,
  };
}

export function toCreateCustomerRequest(
  model: CustomerFormModel,
): CreateCustomerRequest {
  return {
    firstName: model.firstName,
    lastName: model.lastName,
    email: model.email,
    msisdn: model.msisdn,
    gender: Number(model.gender) as Gender,
    birthdate: model.birthdate || undefined,
    address: {
      country: model.country,
      county: model.county,
      town: model.town,
      street: model.street,
      number: model.number,
      zip: model.zip,
    },
  };
}

// The loaded customer with the form's values applied — what the edit page saves, and what
// the local customer list is updated to once the save succeeds. Server-owned fields (guid,
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

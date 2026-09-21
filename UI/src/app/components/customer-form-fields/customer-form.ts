import { pattern, required, schema } from '@angular/forms/signals';
import { environment } from '../../../environments/environment';
import { Customer } from '../../interfaces/customer-response';

// Shared by add-customer and edit-customer: one model shape, one validation
// schema, and the two-way mapping between the form and the API's Customer.
export interface CustomerFormModel {
  firstName: string;
  lastName: string;
  email: string;
  msisdn: string;
  gender: string; // <select> emits strings; the API wants an integer (see toCustomer)
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

// <input type="date"> requires a strictly zero-padded "YYYY-MM-DD" value to
// pre-fill correctly. Older records saved via the previous year/month/day
// text-box form could store unpadded values (e.g. "2020-1-5"), so normalize.
export function toDateInputValue(birthdate: string): string {
  const [year, month, day] = birthdate.split('-');
  if (!year || !month || !day) return '';
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function toFormModel(customer: Customer): CustomerFormModel {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    msisdn: customer.msisdn,
    gender: customer.gender?.toString() ?? '',
    birthdate: toDateInputValue(customer.birthdate),
    country: customer.address.country,
    county: customer.address.county,
    town: customer.address.town,
    street: customer.address.street,
    number: customer.address.number,
    zip: customer.address.zip,
  };
}

// `base` carries the server-owned fields (guid, status, dates) when editing;
// for a new customer they're simply absent and the server generates them.
export function toCustomer(
  model: CustomerFormModel,
  base: Partial<Customer> = {},
): Customer {
  return {
    ...base,
    firstName: model.firstName,
    lastName: model.lastName,
    email: model.email,
    msisdn: model.msisdn,
    gender: Number(model.gender),
    birthdate: model.birthdate,
    address: {
      country: model.country,
      county: model.county,
      town: model.town,
      street: model.street,
      number: model.number,
      zip: model.zip,
    },
  } as Customer;
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

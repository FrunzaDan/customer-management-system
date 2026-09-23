import { IsoDate, IsoDateTime } from './iso-date';

// tbl_customers.gender — serialized by the API as its number.
export enum Gender {
  NotDeclared = 0,
  Male = 1,
  Female = 2,
}

// tbl_customers.customer_Status codes — see ai_docs/database.md.
export enum CustomerActivationStatus {
  Active = 1901,
  Deactivated = 1903,
  Test = 1904,
}

export interface Address {
  country: string;
  county: string;
  town: string;
  zip: string;
  street: string;
  number: string;
}

// A customer as the API returns it. Every field but birthdate is NOT NULL in the DB; the API
// omits null properties entirely, so an unset birthdate arrives as a missing key.
export interface Customer {
  guid: string;
  firstName: string;
  lastName: string;
  msisdn: string;
  email: string;
  gender: Gender;
  customerStatus: CustomerActivationStatus;
  creationDate: IsoDateTime;
  interactionDate: IsoDateTime;
  birthdate?: IsoDate;
  address: Address;
}

// POST /api/Customer/register. No guid: the DB generates it and the response returns it.
export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  msisdn: string;
  gender: Gender;
  birthdate?: IsoDate;
  // Omitted = Active. The only other value the API accepts is Test.
  customerStatus?: CustomerActivationStatus.Active | CustomerActivationStatus.Test;
  address: Address;
}

// PATCH /api/Customer/edit — a partial update: an omitted field is left unchanged. There's no
// customerStatus: status only changes through deactivate/reactivate/delete.
export interface UpdateCustomerRequest extends Partial<Omit<CreateCustomerRequest, 'customerStatus'>> {
  guid: string;
}

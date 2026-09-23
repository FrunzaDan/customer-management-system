import { IsoDate, IsoDateTime } from './iso-date';

// Customer.Gender — serialized by the API as its number.
export enum Gender {
  NotDeclared = 0,
  Male = 1,
  Female = 2,
}

// Customer.StatusCode values — see ai_docs/database.md.
export enum CustomerStatus {
  Active = 1901,
  Deactivated = 1903,
  Test = 1904,
}

export interface Address {
  country: string;
  county: string;
  city: string;
  postalCode: string;
  street: string;
  streetNumber: string;
}

// A customer as the API returns it. Every field but birthDate is NOT NULL in the DB; the API
// omits null properties entirely, so an unset birthDate arrives as a missing key.
export interface Customer {
  customerId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  gender: Gender;
  status: CustomerStatus;
  createdAt: IsoDateTime;
  lastInteractionAt: IsoDateTime;
  birthDate?: IsoDate;
  address: Address;
}

// POST /api/customer/register. No customerId: the DB generates it and the response returns it.
export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: Gender;
  birthDate?: IsoDate;
  // Omitted = Active. The only other value the API accepts is Test.
  status?: CustomerStatus.Active | CustomerStatus.Test;
  address: Address;
}

// PATCH /api/customer/edit — a partial update: an omitted field is left unchanged. There's no
// status: status only changes through deactivate/reactivate/delete.
export interface UpdateCustomerRequest extends Partial<Omit<CreateCustomerRequest, 'status'>> {
  customerId: string;
}

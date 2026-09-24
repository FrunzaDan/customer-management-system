import { IsoDate, IsoDateTime } from './iso-date';

export enum Gender {
  NotDeclared = 0,
  Male = 1,
  Female = 2,
}

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
  birthDate: IsoDate | null;
  address: Address;
}

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: Gender;
  birthDate?: IsoDate;
  status?: CustomerStatus.Active | CustomerStatus.Test;
  address: Address;
}

export interface UpdateCustomerRequest extends Partial<
  Omit<CreateCustomerRequest, 'status'>
> {
  customerId: string;
}

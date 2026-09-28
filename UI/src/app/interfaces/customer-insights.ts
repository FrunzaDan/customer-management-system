import { CustomerStatus, Gender } from './customer';
import { IsoDate } from './iso-date';

export interface CustomerProfile {
  status: CustomerStatus;
  gender: Gender;
  birthDate: IsoDate | null;
  enrollmentDate: IsoDate;
  county: string;
  purchaseCount: number;
}

export interface MonthlySales {
  yearMonth: string;
  purchaseCount: number;
  revenue: number;
}

export interface CustomerInsights {
  customers: CustomerProfile[];
  monthlySales: MonthlySales[];
}

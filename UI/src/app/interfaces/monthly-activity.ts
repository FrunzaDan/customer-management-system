// One month's count of something (registrations, purchases). yearMonth is "yyyy-MM";
// only months with at least one row are present — no zero-filling from the API.
export interface MonthlyCount {
  yearMonth: string;
  count: number;
}

export interface MonthlyActivity {
  customerCreations: MonthlyCount[];
  productPurchases: MonthlyCount[];
}

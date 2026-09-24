export interface MonthlyCount {
  yearMonth: string;
  count: number;
}

export interface MonthlyActivity {
  customerCreations: MonthlyCount[];
  productPurchases: MonthlyCount[];
}

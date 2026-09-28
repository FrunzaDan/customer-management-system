import { Product } from '../../interfaces/product';
import { CustomerStatus, Gender } from '../../interfaces/customer';
import {
  CustomerProfile,
  MonthlySales,
} from '../../interfaces/customer-insights';
import { customerStatusLabel } from '../../utils/customer-status-label';
import {
  AGE_BANDS,
  Band,
  ChartPoint,
  countByMonth,
  countIntoBands,
  fractionalYearsBetween,
  LabelValue,
  MonthlyCount,
  rankTotals,
  TENURE_BANDS,
  totalsByLabel,
  wholeYearsBetween,
} from '../../utils/chart-stats';
import { StockHealthRow } from './stock-health-chart/stock-health-chart.component';

const STATUS_ORDER = [
  CustomerStatus.Active,
  CustomerStatus.Test,
  CustomerStatus.Deactivated,
];

const GENDER_LABELS: ReadonlyArray<[Gender, string]> = [
  [Gender.Female, 'Female'],
  [Gender.Male, 'Male'],
  [Gender.NotDeclared, 'Not declared'],
];

const PURCHASE_COUNT_BANDS: readonly Band[] = [
  { label: 'None', min: 0, max: 1 },
  { label: '1', min: 1, max: 2 },
  { label: '2', min: 2, max: 3 },
  { label: '3', min: 3, max: 4 },
  { label: '4', min: 4, max: 5 },
  { label: '5+', min: 5 },
];

export function rankByCategory(
  products: Product[],
  valueFn: (product: Product) => number,
  limit: number,
): LabelValue[] {
  return rankTotals(
    totalsByLabel(products, (p) => p.category, valueFn),
    limit,
    'categories',
  );
}

export function stockHealthByCategory(products: Product[]): StockHealthRow[] {
  const totals = new Map<string, { sold: number; inventory: number }>();
  for (const product of products) {
    const entry = totals.get(product.category) ?? { sold: 0, inventory: 0 };
    entry.sold += product.soldQuantity;
    entry.inventory += product.initialQuantity;
    totals.set(product.category, entry);
  }

  return [...totals.entries()]
    .map(([label, { sold, inventory }]) => ({ label, sold, inventory }))
    .sort((a, b) => percentSold(b) - percentSold(a));
}

function percentSold(row: { sold: number; inventory: number }): number {
  return row.inventory > 0 ? row.sold / row.inventory : 0;
}

export function statusSlices(customers: CustomerProfile[]): LabelValue[] {
  return STATUS_ORDER.map((status) => ({
    label: customerStatusLabel(status),
    value: customers.filter((c) => c.status === status).length,
  }));
}

export function genderSlices(customers: CustomerProfile[]): LabelValue[] {
  return GENDER_LABELS.map(([gender, label]) => ({
    label,
    value: customers.filter((c) => c.gender === gender).length,
  }));
}

export function ageDistribution(
  customers: CustomerProfile[],
  today: Date,
): ChartPoint[] {
  const ages = customers
    .filter((c) => c.birthDate !== null)
    .map((c) => wholeYearsBetween(c.birthDate!, today));
  return countIntoBands(ages, AGE_BANDS);
}

export function tenureYears(
  customers: CustomerProfile[],
  today: Date,
): number[] {
  return customers.map((c) => fractionalYearsBetween(c.enrollmentDate, today));
}

export function tenureDistribution(
  customers: CustomerProfile[],
  today: Date,
): ChartPoint[] {
  const years = customers.map((c) =>
    wholeYearsBetween(c.enrollmentDate, today),
  );
  return countIntoBands(years, TENURE_BANDS);
}

export function purchasesPerCustomer(
  customers: CustomerProfile[],
): ChartPoint[] {
  return countIntoBands(
    customers.map((c) => c.purchaseCount),
    PURCHASE_COUNT_BANDS,
  );
}

export function topCounties(
  customers: CustomerProfile[],
  limit: number,
): LabelValue[] {
  return rankTotals(
    totalsByLabel(customers, (c) => c.county),
    limit,
    'counties',
  );
}

export function enrollmentCounts(customers: CustomerProfile[]): MonthlyCount[] {
  return countByMonth(customers.map((c) => c.enrollmentDate));
}

export function salesCounts(
  sales: MonthlySales[],
  valueFn: (month: MonthlySales) => number,
): MonthlyCount[] {
  return sales.map((month) => ({
    yearMonth: month.yearMonth,
    count: valueFn(month),
  }));
}

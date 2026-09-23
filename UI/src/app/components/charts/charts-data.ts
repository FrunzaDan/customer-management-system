import { Product } from '../../interfaces/product';
import { MonthlyCount } from '../../interfaces/monthly-activity';
import { RankedItem } from './ranked-bar-chart/ranked-bar-chart.component';
import { StockHealthRow } from './stock-health-chart/stock-health-chart.component';
import { TimeSeriesPoint } from './time-series-chart/time-series-chart.component';

const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

// Sums valueFn(product) per category, ranked descending, folding everything past `limit`
// into one "Other" row — keeps a chart with a dozen-plus categories from a dozen-plus
// unreadably thin bars.
export function rankByCategory(
  products: Product[],
  valueFn: (product: Product) => number,
  limit: number,
): RankedItem[] {
  const totals = new Map<string, number>();
  for (const product of products) {
    totals.set(product.category, (totals.get(product.category) ?? 0) + valueFn(product));
  }

  const sorted = [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= limit) return sorted;

  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const otherValue = rest.reduce((sum, item) => sum + item.value, 0);
  return [...top, { label: `Other (${rest.length} categories)`, value: otherValue }];
}

// Share of each category's originally-stocked units already sold, ranked so the
// categories closest to selling out surface first.
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

// "yyyy-MM" -> "Jan '26" — always carries the year (2-digit) so a range spanning more
// than one year is never ambiguous, unlike a bare "Jan".
function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const index = Number(month) - 1;
  const abbreviation = MONTH_ABBREVIATIONS[index] ?? month;
  return `${abbreviation} '${year.slice(2)}`;
}

export function monthlyToPoints(counts: MonthlyCount[]): TimeSeriesPoint[] {
  return counts.map((count) => ({
    key: count.yearMonth,
    label: formatMonthLabel(count.yearMonth),
    value: count.count,
  }));
}

export function yearlyToPoints(counts: MonthlyCount[]): TimeSeriesPoint[] {
  const totals = new Map<string, number>();
  for (const count of counts) {
    const year = count.yearMonth.slice(0, 4);
    totals.set(year, (totals.get(year) ?? 0) + count.count);
  }

  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, value]) => ({ key: year, label: year, value }));
}

// Running total of monthly registrations — a customer-count-over-time approximation,
// not a currently-active count (it doesn't subtract deletions; see charts.md).
export function cumulativePoints(counts: MonthlyCount[]): TimeSeriesPoint[] {
  let running = 0;
  return counts.map((count) => {
    running += count.count;
    return { key: count.yearMonth, label: formatMonthLabel(count.yearMonth), value: running };
  });
}

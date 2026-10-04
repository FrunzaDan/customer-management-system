import { formatTick } from './chart-scale';

export interface ChartPoint {
  key: string;
  label: string;
  value: number;
}

export interface LabelValue {
  label: string;
  value: number;
}

export interface MonthlyCount {
  yearMonth: string;
  count: number;
}

export interface Band {
  label: string;
  min: number;
  max?: number;
}

export const AGE_BANDS: readonly Band[] = [
  { label: 'Under 25', min: 0, max: 25 },
  { label: '25–34', min: 25, max: 35 },
  { label: '35–44', min: 35, max: 45 },
  { label: '45–54', min: 45, max: 55 },
  { label: '55–64', min: 55, max: 65 },
  { label: '65+', min: 65 },
];

export const TENURE_BANDS: readonly Band[] = [
  { label: 'Under 1 yr', min: 0, max: 1 },
  { label: '1–2 yrs', min: 1, max: 3 },
  { label: '3–5 yrs', min: 3, max: 6 },
  { label: '6–10 yrs', min: 6, max: 11 },
  { label: '11–15 yrs', min: 11, max: 16 },
  { label: '16+ yrs', min: 16 },
];

const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function wholeYearsBetween(isoDate: string, today: Date): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  let years = today.getFullYear() - year;
  const beforeAnniversary =
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeAnniversary) years--;
  return Math.max(years, 0);
}

export function fractionalYearsBetween(isoDate: string, today: Date): number {
  const [year, month, day] = isoDate.split('-').map(Number);
  const start = Date.UTC(year, month - 1, day);
  const end = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max((end - start) / (365.25 * 24 * 60 * 60 * 1000), 0);
}

export function countIntoBands(
  values: readonly number[],
  bands: readonly Band[],
): ChartPoint[] {
  return bands.map((band) => ({
    key: band.label,
    label: band.label,
    value: values.filter(
      (v) => v >= band.min && (band.max === undefined || v < band.max),
    ).length,
  }));
}

export function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function totalsByLabel<T>(
  items: readonly T[],
  labelFn: (item: T) => string,
  valueFn: (item: T) => number = () => 1,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    const label = labelFn(item);
    totals.set(label, (totals.get(label) ?? 0) + valueFn(item));
  }
  return totals;
}

export function rankTotals(
  totals: ReadonlyMap<string, number>,
  limit: number,
  otherNoun: string,
): LabelValue[] {
  const sorted = [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

  if (sorted.length <= limit) return sorted;

  const rest = sorted.slice(limit);
  const otherValue = rest.reduce((sum, item) => sum + item.value, 0);
  return [
    ...sorted.slice(0, limit),
    { label: `Other (${rest.length} ${otherNoun})`, value: otherValue },
  ];
}

export function countByMonth(isoDates: readonly string[]): MonthlyCount[] {
  const totals = new Map<string, number>();
  for (const date of isoDates) {
    const yearMonth = date.slice(0, 7);
    totals.set(yearMonth, (totals.get(yearMonth) ?? 0) + 1);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, count]) => ({ yearMonth, count }));
}

function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const abbreviation = MONTH_ABBREVIATIONS[Number(month) - 1] ?? month;
  return `${abbreviation} '${year.slice(2)}`;
}

function toYearMonth(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function monthlyToPoints(counts: readonly MonthlyCount[]): ChartPoint[] {
  if (counts.length === 0) return [];
  const totals = new Map(counts.map((c) => [c.yearMonth, c.count]));
  const keys = [...totals.keys()].sort();
  const [firstYear, firstMonth] = keys[0].split('-').map(Number);
  const last = keys[keys.length - 1];

  const points: ChartPoint[] = [];
  let year = firstYear;
  let monthIndex = firstMonth - 1;
  for (;;) {
    const key = toYearMonth(year, monthIndex);
    points.push({
      key,
      label: formatMonthLabel(key),
      value: totals.get(key) ?? 0,
    });
    if (key >= last) break;
    monthIndex++;
    if (monthIndex === 12) {
      monthIndex = 0;
      year++;
    }
  }
  return points;
}

export function yearlyToPoints(counts: readonly MonthlyCount[]): ChartPoint[] {
  const totals = new Map<number, number>();
  for (const count of counts) {
    const year = Number(count.yearMonth.slice(0, 4));
    totals.set(year, (totals.get(year) ?? 0) + count.count);
  }
  if (totals.size === 0) return [];

  const years = [...totals.keys()];
  const first = Math.min(...years);
  const last = Math.max(...years);
  const points: ChartPoint[] = [];
  for (let year = first; year <= last; year++) {
    const key = year.toString();
    points.push({ key, label: key, value: totals.get(year) ?? 0 });
  }
  return points;
}

export function cumulativeYearlyPoints(
  counts: readonly MonthlyCount[],
): ChartPoint[] {
  let running = 0;
  return yearlyToPoints(counts).map((point) => {
    running += point.value;
    return { ...point, value: running };
  });
}

export function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const residual = raw / magnitude;
  const candidates = [1, 2, 5, 10];
  const best = candidates.reduce((a, b) =>
    Math.abs(Math.log(b / residual)) < Math.abs(Math.log(a / residual)) ? b : a,
  );
  return best * magnitude;
}

export function histogram(
  values: readonly number[],
  targetBins = 8,
): ChartPoint[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const label = formatTick(min);
    return [{ key: label, label, value: values.length }];
  }

  const step = niceStep((max - min) / targetBins);
  const start = Math.floor(min / step) * step;
  const binCount = Math.floor((max - start) / step) + 1;
  const counts = new Array<number>(binCount).fill(0);
  for (const value of values) {
    counts[Math.min(Math.floor((value - start) / step), binCount - 1)]++;
  }

  return counts.map((count, index) => {
    const low = start + index * step;
    const label = `${formatTick(low)}–${formatTick(low + step)}`;
    return { key: label, label, value: count };
  });
}

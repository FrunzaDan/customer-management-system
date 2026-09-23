import { Product } from '../../interfaces/product';
import { MonthlyCount } from '../../interfaces/monthly-activity';
import {
  cumulativePoints,
  monthlyToPoints,
  rankByCategory,
  stockHealthByCategory,
  yearlyToPoints,
} from './charts-data';

const buildProduct = (overrides: Partial<Product> = {}): Product => ({
  productId: 'product-1',
  name: 'Aerobook 14 Pro',
  category: 'Laptop',
  description: null,
  price: 1000,
  initialQuantity: 10,
  quantityOnHand: 5,
  soldQuantity: 5,
  warehouse: 'Central Depot',
  ...overrides,
});

describe('rankByCategory', () => {
  it('sums valueFn per category and sorts descending', () => {
    const products = [
      buildProduct({ category: 'Audio', soldQuantity: 3 }),
      buildProduct({ category: 'Audio', soldQuantity: 4 }),
      buildProduct({ category: 'Laptops', soldQuantity: 10 }),
    ];

    const result = rankByCategory(products, (p) => p.soldQuantity, 7);

    expect(result).toEqual([
      { label: 'Laptops', value: 10 },
      { label: 'Audio', value: 7 },
    ]);
  });

  it('folds everything past the limit into one "Other" row', () => {
    const products = [
      buildProduct({ category: 'A', soldQuantity: 5 }),
      buildProduct({ category: 'B', soldQuantity: 4 }),
      buildProduct({ category: 'C', soldQuantity: 3 }),
      buildProduct({ category: 'D', soldQuantity: 2 }),
    ];

    const result = rankByCategory(products, (p) => p.soldQuantity, 2);

    expect(result).toEqual([
      { label: 'A', value: 5 },
      { label: 'B', value: 4 },
      { label: 'Other (2 categories)', value: 5 },
    ]);
  });

  it('returns an empty list for an empty catalogue', () => {
    expect(rankByCategory([], (p) => p.soldQuantity, 7)).toEqual([]);
  });
});

describe('stockHealthByCategory', () => {
  it('sums sold/inventory per category and ranks by percent sold, descending', () => {
    const products = [
      buildProduct({
        category: 'Gaming',
        soldQuantity: 9,
        initialQuantity: 10,
      }),
      buildProduct({ category: 'Audio', soldQuantity: 2, initialQuantity: 10 }),
    ];

    const result = stockHealthByCategory(products);

    expect(result).toEqual([
      { label: 'Gaming', sold: 9, inventory: 10 },
      { label: 'Audio', sold: 2, inventory: 10 },
    ]);
  });

  it('treats zero inventory as 0% sold rather than dividing by zero', () => {
    const products = [
      buildProduct({ category: 'Empty', soldQuantity: 0, initialQuantity: 0 }),
    ];

    const result = stockHealthByCategory(products);

    expect(result).toEqual([{ label: 'Empty', sold: 0, inventory: 0 }]);
  });
});

describe('monthlyToPoints', () => {
  it('formats each month as "Mon \'YY" and keeps the API order', () => {
    const counts: MonthlyCount[] = [
      { yearMonth: '2025-12', count: 4 },
      { yearMonth: '2026-01', count: 7 },
    ];

    expect(monthlyToPoints(counts)).toEqual([
      { key: '2025-12', label: "Dec '25", value: 4 },
      { key: '2026-01', label: "Jan '26", value: 7 },
    ]);
  });
});

describe('yearlyToPoints', () => {
  it('sums counts per year and sorts ascending', () => {
    const counts: MonthlyCount[] = [
      { yearMonth: '2025-11', count: 3 },
      { yearMonth: '2025-12', count: 5 },
      { yearMonth: '2024-06', count: 2 },
    ];

    expect(yearlyToPoints(counts)).toEqual([
      { key: '2024', label: '2024', value: 2 },
      { key: '2025', label: '2025', value: 8 },
    ]);
  });
});

describe('cumulativePoints', () => {
  it('produces a running total, keyed and labeled like the monthly series', () => {
    const counts: MonthlyCount[] = [
      { yearMonth: '2026-01', count: 3 },
      { yearMonth: '2026-02', count: 5 },
      { yearMonth: '2026-03', count: 2 },
    ];

    expect(cumulativePoints(counts)).toEqual([
      { key: '2026-01', label: "Jan '26", value: 3 },
      { key: '2026-02', label: "Feb '26", value: 8 },
      { key: '2026-03', label: "Mar '26", value: 10 },
    ]);
  });
});

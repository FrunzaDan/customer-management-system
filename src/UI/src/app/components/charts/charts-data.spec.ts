import { Product } from '../../interfaces/product';
import { CustomerProfile } from '../../interfaces/customer-insights';
import {
  ageDistribution,
  enrollmentCounts,
  genderSlices,
  purchasesPerCustomer,
  rankByCategory,
  salesCounts,
  statusSlices,
  stockHealthByCategory,
  tenureDistribution,
  topCounties,
} from './charts-data';

const buildCustomer = (
  overrides: Partial<CustomerProfile> = {},
): CustomerProfile => ({
  status: 1901,
  gender: 1,
  birthDate: '1990-01-01',
  enrollmentDate: '2015-06-01',
  county: 'Cluj',
  purchaseCount: 0,
  ...overrides,
});

const TODAY = new Date(2026, 8, 28);

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

describe('statusSlices', () => {
  it('counts active, test and deactivated customers in that order', () => {
    const customers = [
      buildCustomer({ status: 1901 }),
      buildCustomer({ status: 1904 }),
      buildCustomer({ status: 1904 }),
    ];

    expect(statusSlices(customers)).toEqual([
      { label: 'Active', value: 1 },
      { label: 'Test', value: 2 },
      { label: 'Deactivated', value: 0 },
    ]);
  });
});

describe('genderSlices', () => {
  it('counts each declared gender, keeping zero slices', () => {
    const customers = [
      buildCustomer({ gender: 2 }),
      buildCustomer({ gender: 2 }),
      buildCustomer({ gender: 0 }),
    ];

    expect(genderSlices(customers)).toEqual([
      { label: 'Female', value: 2 },
      { label: 'Male', value: 0 },
      { label: 'Not declared', value: 1 },
    ]);
  });
});

describe('ageDistribution', () => {
  it('bands current ages and skips customers without a birth date', () => {
    const customers = [
      buildCustomer({ birthDate: '2002-09-29' }), // 23, birthday is tomorrow
      buildCustomer({ birthDate: '2001-09-28' }), // 25 today
      buildCustomer({ birthDate: '1950-01-01' }), // 76
      buildCustomer({ birthDate: null }),
    ];

    expect(ageDistribution(customers, TODAY).map((p) => p.value)).toEqual([
      1, 1, 0, 0, 0, 1,
    ]);
  });
});

describe('tenureDistribution', () => {
  it('bands whole years since enrollment', () => {
    const customers = [
      buildCustomer({ enrollmentDate: '2026-01-01' }),
      buildCustomer({ enrollmentDate: '2021-09-28' }),
      buildCustomer({ enrollmentDate: '2005-01-01' }),
    ];

    expect(tenureDistribution(customers, TODAY)).toEqual([
      { key: 'Under 1 yr', label: 'Under 1 yr', value: 1 },
      { key: '1–2 yrs', label: '1–2 yrs', value: 0 },
      { key: '3–5 yrs', label: '3–5 yrs', value: 1 },
      { key: '6–10 yrs', label: '6–10 yrs', value: 0 },
      { key: '11–15 yrs', label: '11–15 yrs', value: 0 },
      { key: '16+ yrs', label: '16+ yrs', value: 1 },
    ]);
  });
});

describe('purchasesPerCustomer', () => {
  it('buckets purchase counts, folding 5 and above together', () => {
    const customers = [0, 1, 1, 5, 9].map((purchaseCount) =>
      buildCustomer({ purchaseCount }),
    );

    expect(purchasesPerCustomer(customers).map((p) => p.value)).toEqual([
      1, 2, 0, 0, 0, 2,
    ]);
  });
});

describe('topCounties', () => {
  it('ranks counties by customer count and folds the rest into "Other"', () => {
    const customers = ['Cluj', 'Cluj', 'Iasi', 'Bihor', 'Alba'].map((county) =>
      buildCustomer({ county }),
    );

    expect(topCounties(customers, 2)).toEqual([
      { label: 'Cluj', value: 2 },
      { label: 'Alba', value: 1 },
      { label: 'Other (2 counties)', value: 2 },
    ]);
  });
});

describe('enrollmentCounts', () => {
  it('counts enrollments per month, oldest first', () => {
    const customers = ['2012-05-20', '2010-01-02', '2012-05-01'].map(
      (enrollmentDate) => buildCustomer({ enrollmentDate }),
    );

    expect(enrollmentCounts(customers)).toEqual([
      { yearMonth: '2010-01', count: 1 },
      { yearMonth: '2012-05', count: 2 },
    ]);
  });
});

describe('salesCounts', () => {
  it('picks the requested measure from each month', () => {
    const sales = [{ yearMonth: '2026-01', purchaseCount: 3, revenue: 1200 }];

    expect(salesCounts(sales, (m) => m.revenue)).toEqual([
      { yearMonth: '2026-01', count: 1200 },
    ]);
  });
});

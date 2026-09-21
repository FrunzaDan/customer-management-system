import { Product } from '../interfaces/product';
import {
  MAX_TEST_PURCHASES,
  MIN_TEST_PURCHASES,
  chooseProductsToBuy,
} from './random-purchases';

const buildProduct = (n: number, stockQuantity = 10): Product => ({
  guid: `p${n}`,
  name: `Product ${n}`,
  category: 'Laptop',
  comment: null,
  price: 100,
  inventoryQuantity: 10,
  stockQuantity,
  soldQuantity: 10 - stockQuantity,
  depot: 'Central Depot',
});

const catalogue = (size = 50) => Array.from({ length: size }, (_, i) => buildProduct(i));

describe('chooseProductsToBuy', () => {
  it('always picks between 1 and 5 products (checked over many random draws)', () => {
    const counts = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const chosen = chooseProductsToBuy(catalogue());
      expect(chosen.length).toBeGreaterThanOrEqual(MIN_TEST_PURCHASES);
      expect(chosen.length).toBeLessThanOrEqual(MAX_TEST_PURCHASES);
      counts.add(chosen.length);
    }
    // ...and the whole range is actually reachable, not just one value.
    expect([...counts].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('draws the lowest count at random() = 0 and the highest just below 1', () => {
    expect(chooseProductsToBuy(catalogue(), () => 0)).toHaveLength(1);
    expect(chooseProductsToBuy(catalogue(), () => 0.999999)).toHaveLength(5);
  });

  it('never picks the same product twice', () => {
    for (let i = 0; i < 200; i++) {
      const guids = chooseProductsToBuy(catalogue()).map((p) => p.guid);
      expect(new Set(guids).size).toBe(guids.length);
    }
  });

  it('only picks products that are in stock', () => {
    const products = [...catalogue(10).map((p) => ({ ...p, stockQuantity: 0 })), buildProduct(99, 3)];

    for (let i = 0; i < 50; i++) {
      expect(chooseProductsToBuy(products).map((p) => p.guid)).toEqual(['p99']);
    }
  });

  it('returns fewer than the drawn count when fewer products are in stock', () => {
    const products = [buildProduct(1), buildProduct(2)];

    expect(chooseProductsToBuy(products, () => 0.999999)).toHaveLength(2);
  });

  it('returns nothing when the whole catalogue is sold out', () => {
    expect(chooseProductsToBuy(catalogue(5).map((p) => ({ ...p, stockQuantity: 0 })))).toEqual([]);
    expect(chooseProductsToBuy([])).toEqual([]);
  });

  it('does not mutate the list it was given', () => {
    const products = catalogue(10);
    const snapshot = products.map((p) => p.guid);

    chooseProductsToBuy(products);

    expect(products.map((p) => p.guid)).toEqual(snapshot);
  });
});

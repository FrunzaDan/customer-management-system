import { Product } from '../interfaces/product';

export const MIN_TEST_PURCHASES = 1;
export const MAX_TEST_PURCHASES = 5;

export function chooseProductsToBuy(
  products: ReadonlyArray<Product>,
  random: () => number = Math.random,
): Product[] {
  const count =
    MIN_TEST_PURCHASES +
    Math.floor(random() * (MAX_TEST_PURCHASES - MIN_TEST_PURCHASES + 1));

  return shuffled(
    products.filter((p) => p.quantityOnHand > 0),
    random,
  ).slice(0, count);
}

function shuffled<T>(values: ReadonlyArray<T>, random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

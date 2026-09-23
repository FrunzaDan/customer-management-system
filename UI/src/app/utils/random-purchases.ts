import { Product } from '../interfaces/product';

export const MIN_TEST_PURCHASES = 1;
export const MAX_TEST_PURCHASES = 5;

/**
 * Picks the products one generated test customer should buy: a random count between
 * {@link MIN_TEST_PURCHASES} and {@link MAX_TEST_PURCHASES} (inclusive) of *distinct*
 * products, in random order, drawn only from products that still have stock.
 *
 * Returns fewer than the drawn count if fewer products are in stock, and none if the
 * catalogue is sold out. Callers should treat the result as an ordered preference list
 * (a purchase can still fail — e.g. stock taken elsewhere — so they may try the next one).
 */
export function chooseProductsToBuy(
  products: ReadonlyArray<Product>,
  random: () => number = Math.random,
): Product[] {
  const count =
    MIN_TEST_PURCHASES +
    Math.floor(random() * (MAX_TEST_PURCHASES - MIN_TEST_PURCHASES + 1));

  return shuffled(products.filter((p) => p.quantityOnHand > 0), random).slice(
    0,
    count,
  );
}

// Fisher–Yates, on a copy.
function shuffled<T>(values: ReadonlyArray<T>, random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

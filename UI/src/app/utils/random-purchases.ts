import { IsoDate, IsoDateTime } from '../interfaces/iso-date';
import { Product } from '../interfaces/product';

export const MIN_TEST_PURCHASES = 1;
export const MAX_TEST_PURCHASES = 5;

export function chooseProductsToBuy(
  products: readonly Product[],
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

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Shop hours, in UTC: 07:00 to 19:00 is 9 to 9 in Romania.
const SHOP_OPENS_UTC_HOUR = 7;
const SHOP_HOURS = 12;

const DAY_MS = 86_400_000;

// A moment during shop hours on a day between the customer's enrollment and
// now, so their purchases spread over the time they have been a customer.
export function randomPurchaseTime(
  enrolledOn: IsoDate,
  now: Date = new Date(),
  random: () => number = Math.random,
): IsoDateTime {
  const [year, month, day] = enrolledOn.split('-').map(Number);
  const firstDay = Date.UTC(year, month - 1, day);
  const days = Math.max(0, Math.floor((now.getTime() - firstDay) / DAY_MS));

  const time = new Date(
    firstDay +
      Math.floor(random() * (days + 1)) * DAY_MS +
      SHOP_OPENS_UTC_HOUR * 3_600_000 +
      Math.floor(random() * SHOP_HOURS * 60) * 60_000,
  );
  return (time > now ? now : time).toISOString();
}

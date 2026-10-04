import { Gender } from '../interfaces/customer';
import { buildRandomCustomer, randomGender } from './random-customer';

const yearsBetween = (from: string, to: string) =>
  (new Date(to).getTime() - new Date(from).getTime()) / (365.25 * 86_400_000);

describe('randomGender', () => {
  afterEach(() => vi.restoreAllMocks());

  it('gives 46% male, 46% female and 8% not declared', () => {
    const genderAt = (roll: number) => {
      vi.spyOn(Math, 'random').mockReturnValue(roll);
      return randomGender();
    };

    expect(genderAt(0)).toBe(Gender.Male);
    expect(genderAt(0.459)).toBe(Gender.Male);
    expect(genderAt(0.46)).toBe(Gender.Female);
    expect(genderAt(0.919)).toBe(Gender.Female);
    expect(genderAt(0.92)).toBe(Gender.NotDeclared);
    expect(genderAt(0.999)).toBe(Gender.NotDeclared);
  });

  it('declares a gender far more often than not', () => {
    const genders = Array.from({ length: 2000 }, () => randomGender());
    const count = (gender: Gender) =>
      genders.filter((g) => g === gender).length;

    expect(count(Gender.Male)).toBeGreaterThan(count(Gender.NotDeclared) * 3);
    expect(count(Gender.Female)).toBeGreaterThan(count(Gender.NotDeclared) * 3);
  });
});

describe('buildRandomCustomer', () => {
  const enrolledFrom = new Date(2005, 0, 1);
  const enrolledTo = new Date(2025, 11, 1);
  const today = new Date().toISOString().slice(0, 10);
  const build = (count: number) => {
    const taken = new Set<string>();
    return Array.from({ length: count }, () =>
      buildRandomCustomer(enrolledFrom, enrolledTo, taken),
    );
  };

  it('makes adults of 18 to 88 who enrolled no earlier than their 18th birthday', () => {
    for (const customer of build(300)) {
      const age = yearsBetween(customer.birthDate, today);
      expect(age).toBeGreaterThanOrEqual(18 - 0.01);
      expect(age).toBeLessThanOrEqual(88 + 0.01);
      expect(
        yearsBetween(customer.birthDate, customer.enrollmentDate),
      ).toBeGreaterThanOrEqual(18 - 0.01);
      expect(customer.enrollmentDate >= '2005-01-01').toBe(true);
      expect(customer.enrollmentDate <= today).toBe(true);
    }
  });

  it('never repeats an email or a phone number within a run', () => {
    const customers = build(200);

    expect(new Set(customers.map((c) => c.email)).size).toBe(200);
    expect(new Set(customers.map((c) => c.phoneNumber)).size).toBe(200);
  });

  it('writes emails, phone numbers and postal codes the API accepts', () => {
    for (const customer of build(200)) {
      expect(customer.email).toMatch(/^[a-z0-9._-]+@[a-z.]+\.[a-z]+$/);
      expect(customer.phoneNumber).toMatch(/^07[2-9]\d{7}$/);
      expect(customer.address.postalCode).toMatch(/^\d{6}$/);
    }
  });

  it('varies the names and places instead of reusing a handful', () => {
    const customers = build(50);

    expect(new Set(customers.map((c) => c.firstName)).size).toBeGreaterThan(20);
    expect(new Set(customers.map((c) => c.address.city)).size).toBeGreaterThan(
      15,
    );
  });
});

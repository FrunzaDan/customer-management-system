import { describe, expect, it } from 'vitest';
import { formatTick, niceMax } from './chart-scale';

describe('niceMax', () => {
  it('rounds up to 1, 2, 5 or 10 times a power of ten', () => {
    expect(niceMax(0.7)).toBe(1);
    expect(niceMax(1.5)).toBe(2);
    expect(niceMax(37)).toBe(50);
    expect(niceMax(720)).toBe(1000);
    expect(niceMax(100)).toBe(100);
  });

  it('returns 1 for an empty or all-zero chart', () => {
    expect(niceMax(0)).toBe(1);
  });
});

describe('formatTick', () => {
  it('keeps up to two decimals below 1000', () => {
    expect(formatTick(0)).toBe('0');
    expect(formatTick(0.5)).toBe('0.5');
    expect(formatTick(25)).toBe('25');
  });

  it('abbreviates thousands', () => {
    expect(formatTick(1000)).toBe('1k');
    expect(formatTick(2500)).toBe('2.5k');
  });
});

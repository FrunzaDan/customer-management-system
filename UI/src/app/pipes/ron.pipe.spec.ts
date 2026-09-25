import { describe, expect, it } from 'vitest';
import { RonPipe } from './ron.pipe';

describe('RonPipe', () => {
  const pipe = new RonPipe();

  it('puts a space between the amount and the currency', () => {
    expect(pipe.transform(15)).toBe('15,00 RON');
  });

  it('uses a decimal comma and groups thousands with dots', () => {
    expect(pipe.transform(5.5)).toBe('5,50 RON');
    expect(pipe.transform(1234.5)).toBe('1.234,50 RON');
    expect(pipe.transform(0)).toBe('0,00 RON');
  });

  it('takes a number format, for whole-RON chart labels', () => {
    expect(pipe.transform(1234.5, '1.0-0')).toBe('1.235 RON');
  });

  it('renders nothing for null/undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});

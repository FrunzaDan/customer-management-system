import { areaUnder, smoothPath } from './chart-geometry';

describe('smoothPath', () => {
  it('is empty for no points and a bare move for one point', () => {
    expect(smoothPath([])).toBe('');
    expect(smoothPath([{ x: 1, y: 2 }])).toBe('M1,2');
  });

  it('draws one cubic segment per gap, passing through every point', () => {
    const path = smoothPath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);

    expect(path.startsWith('M0,10 C')).toBe(true);
    expect(path.match(/C/g)).toHaveLength(2);
    expect(path).toContain(' 10,0 C');
    expect(path.endsWith(' 20,10')).toBe(true);
  });

  it('keeps a flat stretch flat (no overshoot)', () => {
    const path = smoothPath([
      { x: 0, y: 5 },
      { x: 10, y: 5 },
      { x: 20, y: 0 },
    ]);

    expect(path).toContain('C3.33,5 6.67,5 10,5');
  });
});

describe('areaUnder', () => {
  it('closes the curve down to the baseline', () => {
    expect(
      areaUnder(
        [
          { x: 0, y: 5 },
          { x: 10, y: 5 },
        ],
        20,
      ),
    ).toBe('M0,5 C3.33,5 6.67,5 10,5 L10,20 L0,20 Z');
  });
});

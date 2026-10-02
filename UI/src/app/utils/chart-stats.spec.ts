import {
  average,
  countByMonth,
  countIntoBands,
  cumulativeYearlyPoints,
  fractionalYearsBetween,
  histogram,
  median,
  MonthlyCount,
  monthlyToPoints,
  niceStep,
  rankTotals,
  totalsByLabel,
  wholeYearsBetween,
  yearlyToPoints,
} from './chart-stats';

const TODAY = new Date(2026, 8, 28);

describe('wholeYearsBetween', () => {
  it('counts a year only once the anniversary has passed', () => {
    expect(wholeYearsBetween('2000-09-28', TODAY)).toBe(26);
    expect(wholeYearsBetween('2000-09-29', TODAY)).toBe(25);
    expect(wholeYearsBetween('2000-10-01', TODAY)).toBe(25);
  });

  it('never goes negative for a future date', () => {
    expect(wholeYearsBetween('2030-01-01', TODAY)).toBe(0);
  });
});

describe('fractionalYearsBetween', () => {
  it('returns years with a fraction', () => {
    expect(fractionalYearsBetween('2024-09-28', TODAY)).toBeCloseTo(2, 2);
    expect(fractionalYearsBetween('2026-03-28', TODAY)).toBeCloseTo(0.5, 1);
  });
});

describe('countIntoBands', () => {
  it('counts values into [min, max) bands, with an open last band', () => {
    const bands = [
      { label: 'low', min: 0, max: 10 },
      { label: 'high', min: 10 },
    ];

    expect(countIntoBands([0, 9.9, 10, 500], bands)).toEqual([
      { key: 'low', label: 'low', value: 2 },
      { key: 'high', label: 'high', value: 2 },
    ]);
  });
});

describe('average and median', () => {
  it('return null for no values', () => {
    expect(average([])).toBeNull();
    expect(median([])).toBeNull();
  });

  it('compute the mean and the middle value', () => {
    expect(average([1, 2, 6])).toBe(3);
    expect(median([9, 1, 5])).toBe(5);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('rankTotals', () => {
  it('sorts by value (ties alphabetically) and folds the rest into "Other"', () => {
    const totals = totalsByLabel(['b', 'a', 'c', 'c', 'd'], (v) => v);

    expect(rankTotals(totals, 2, 'letters')).toEqual([
      { label: 'c', value: 2 },
      { label: 'a', value: 1 },
      { label: 'Other (2 letters)', value: 2 },
    ]);
  });

  it('adds no "Other" when there are exactly as many labels as the limit', () => {
    const totals = totalsByLabel(['a', 'b', 'b'], (v) => v);

    expect(rankTotals(totals, 2, 'letters')).toEqual([
      { label: 'b', value: 2 },
      { label: 'a', value: 1 },
    ]);
  });

  it('adds up a custom value per label', () => {
    const totals = totalsByLabel(
      [
        { team: 'x', pay: 10 },
        { team: 'x', pay: 5 },
      ],
      (row) => row.team,
      (row) => row.pay,
    );

    expect(rankTotals(totals, 5, 'teams')).toEqual([{ label: 'x', value: 15 }]);
  });
});

describe('countByMonth', () => {
  it('groups ISO dates by month, oldest first', () => {
    expect(countByMonth(['2026-02-10', '2025-12-31', '2026-02-01'])).toEqual([
      { yearMonth: '2025-12', count: 1 },
      { yearMonth: '2026-02', count: 2 },
    ]);
  });
});

describe('monthlyToPoints', () => {
  it('formats each month as "Mon \'YY" and fills empty months with zero', () => {
    const counts: MonthlyCount[] = [
      { yearMonth: '2025-11', count: 4 },
      { yearMonth: '2026-01', count: 7 },
    ];

    expect(monthlyToPoints(counts)).toEqual([
      { key: '2025-11', label: "Nov '25", value: 4 },
      { key: '2025-12', label: "Dec '25", value: 0 },
      { key: '2026-01', label: "Jan '26", value: 7 },
    ]);
  });

  it('returns an empty list when there is no data', () => {
    expect(monthlyToPoints([])).toEqual([]);
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

  it('fills the years in between with zero so the axis keeps real spacing', () => {
    const counts: MonthlyCount[] = [
      { yearMonth: '2005-03', count: 1 },
      { yearMonth: '2008-07', count: 2 },
    ];

    expect(yearlyToPoints(counts).map((p) => p.value)).toEqual([1, 0, 0, 2]);
  });

  it('returns an empty list when there is no data', () => {
    expect(yearlyToPoints([])).toEqual([]);
  });
});

describe('cumulativeYearlyPoints', () => {
  it('produces a running total per year, carrying it through empty years', () => {
    const counts: MonthlyCount[] = [
      { yearMonth: '2024-01', count: 3 },
      { yearMonth: '2024-09', count: 5 },
      { yearMonth: '2026-03', count: 2 },
    ];

    expect(cumulativeYearlyPoints(counts)).toEqual([
      { key: '2024', label: '2024', value: 8 },
      { key: '2025', label: '2025', value: 8 },
      { key: '2026', label: '2026', value: 10 },
    ]);
  });
});

describe('niceStep', () => {
  it('snaps to the closest 1, 2 or 5 times a power of ten', () => {
    expect(niceStep(1125)).toBe(1000);
    expect(niceStep(1600)).toBe(2000);
    expect(niceStep(380)).toBe(500);
    expect(niceStep(0)).toBe(1);
  });
});

describe('histogram', () => {
  it('bins values into nice, labelled ranges', () => {
    const result = histogram([3000, 3500, 4200, 11999, 12000], 9);

    expect(result[0]).toEqual({ key: '3k–4k', label: '3k–4k', value: 2 });
    expect(result.at(-1)).toEqual({
      key: '12k–13k',
      label: '12k–13k',
      value: 1,
    });
    expect(result.reduce((sum, p) => sum + p.value, 0)).toBe(5);
  });

  it('puts identical values into one bin', () => {
    expect(histogram([5000, 5000])).toEqual([
      { key: '5k', label: '5k', value: 2 },
    ]);
  });

  it('returns an empty list for no values', () => {
    expect(histogram([])).toEqual([]);
  });
});

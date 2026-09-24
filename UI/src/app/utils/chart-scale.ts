// Axis math shared by the hand-built SVG charts. Identical in the customer and
// Imalo apps (the employee app has no charts) — change them together.

// Smallest "nice" round number >= raw, for axis ticks (0 / 5 / 10 / 50 / 100 ...).
export function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const residual = raw / magnitude;
  const niceResidual =
    residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
}

// Axis tick label: "1.5k" from 1000 up, otherwise up to two decimals — an
// all-zero chart's scale is 0 / 0.5 / 1, and rounding would print "1" twice.
export function formatTick(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
    : String(Math.round(value * 100) / 100);
}

export interface XY {
  x: number;
  y: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// Monotone cubic interpolation (Fritsch–Carlson): a smooth curve through every
// point that never overshoots, so a flat stretch stays flat and a zero stays zero.
export function smoothPath(points: readonly XY[]): string {
  if (points.length === 0) return '';
  if (points.length === 1)
    return `M${round(points[0].x)},${round(points[0].y)}`;

  const n = points.length;
  const secants: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    secants.push(dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx);
  }

  const tangents: number[] = [secants[0]];
  for (let i = 1; i < n - 1; i++) {
    const before = secants[i - 1];
    const after = secants[i];
    tangents.push(before * after <= 0 ? 0 : (before + after) / 2);
  }
  tangents.push(secants[n - 2]);

  for (let i = 0; i < n - 1; i++) {
    if (secants[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / secants[i];
    const b = tangents[i + 1] / secants[i];
    const magnitude = a * a + b * b;
    if (magnitude > 9) {
      const scale = 3 / Math.sqrt(magnitude);
      tangents[i] = scale * a * secants[i];
      tangents[i + 1] = scale * b * secants[i];
    }
  }

  let path = `M${round(points[0].x)},${round(points[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const third = (p1.x - p0.x) / 3;
    path +=
      ` C${round(p0.x + third)},${round(p0.y + tangents[i] * third)}` +
      ` ${round(p1.x - third)},${round(p1.y - tangents[i + 1] * third)}` +
      ` ${round(p1.x)},${round(p1.y)}`;
  }
  return path;
}

export function areaUnder(points: readonly XY[], baselineY: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return (
    `${smoothPath(points)} L${round(last.x)},${round(baselineY)}` +
    ` L${round(first.x)},${round(baselineY)} Z`
  );
}

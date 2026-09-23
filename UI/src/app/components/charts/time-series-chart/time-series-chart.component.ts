import { Component, computed, input } from '@angular/core';

export interface TimeSeriesPoint {
  key: string;
  label: string;
  value: number;
}

interface BarMark {
  key: string;
  label: string;
  x: number;
  width: number;
  y: number;
  height: number;
  path: string;
  isPeak: boolean;
  valueText: string;
  tooltip: string;
}

interface LinePoint {
  key: string;
  label: string;
  x: number;
  y: number;
  // Direct label only on the first/last point (the run's start and current total) —
  // labeling every point would clutter a chart already showing the axis.
  labelAnchor: 'start' | 'end' | null;
  valueText: string;
  tooltip: string;
}

interface GridLine {
  y: number;
  label: string;
}

const BAND_WIDTH = 56;
const BAR_WIDTH = 28;
const PLOT_HEIGHT = 150;
const TOP_PADDING = 22;
const AXIS_HEIGHT = 22;
const LEFT_PADDING = 30;
const MIN_CHART_WIDTH = 260;
const MARKER_RADIUS = 4.5;
const BAR_CORNER_RADIUS = 4;

// Smallest "nice" round number >= raw, for axis ticks (0 / 5 / 10 / 50 / 100 ...).
function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const residual = raw / magnitude;
  const niceResidual =
    residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
}

function formatTick(value: number): string {
  return value >= 1000
    ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
    : String(Math.round(value));
}

// 4px-rounded top, square baseline — a bar's data-end is the far end from the
// axis, per the app's chart mark spec.
function roundedTopPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  const r = Math.min(radius, width / 2, Math.max(height, 0));
  if (height <= 0) return '';
  return (
    `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} ` +
    `L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} ` +
    `L${x + width},${y + height} Z`
  );
}

// Vertical bars (monthly/yearly counts) or a line+area (cumulative totals), sharing one
// axis/gridline scale — a single series, so no legend/categorical color is needed.
@Component({
  selector: 'app-time-series-chart',
  templateUrl: './time-series-chart.component.html',
  styleUrl: './time-series-chart.component.css',
})
export class TimeSeriesChartComponent {
  readonly points = input.required<TimeSeriesPoint[]>();
  readonly variant = input<'bar' | 'line'>('bar');
  readonly valueFormatter = input<(value: number) => string>((value) =>
    value.toLocaleString(),
  );
  readonly emptyMessage = input('No data yet.');

  readonly hasData = computed(() => this.points().length > 0);

  readonly plotHeight = PLOT_HEIGHT;
  readonly axisY = TOP_PADDING + PLOT_HEIGHT;
  readonly leftPadding = LEFT_PADDING;

  readonly svgWidth = computed(() =>
    Math.max(this.points().length * BAND_WIDTH + LEFT_PADDING, MIN_CHART_WIDTH),
  );
  readonly svgHeight = TOP_PADDING + PLOT_HEIGHT + AXIS_HEIGHT;

  private readonly maxValue = computed(() =>
    niceMax(Math.max(0, ...this.points().map((p) => p.value))),
  );

  readonly gridLines = computed<GridLine[]>(() => {
    const max = this.maxValue();
    return [0, 0.5, 1].map((fraction) => ({
      y: TOP_PADDING + PLOT_HEIGHT * (1 - fraction),
      label: formatTick(max * fraction),
    }));
  });

  readonly barMarks = computed<BarMark[]>(() => {
    const max = this.maxValue();
    const formatter = this.valueFormatter();
    const points = this.points();
    const peak = Math.max(0, ...points.map((p) => p.value));

    return points.map((point, index) => {
      const bandX = index * BAND_WIDTH + LEFT_PADDING;
      const x = bandX + (BAND_WIDTH - BAR_WIDTH) / 2;
      const height = (point.value / max) * PLOT_HEIGHT;
      const y = this.axisY - height;
      const valueText = formatter(point.value);

      return {
        key: point.key,
        label: point.label,
        x,
        width: BAR_WIDTH,
        y,
        height,
        path: roundedTopPath(x, y, BAR_WIDTH, height, BAR_CORNER_RADIUS),
        isPeak: point.value === peak && peak > 0,
        valueText,
        tooltip: `${point.label}: ${valueText}`,
      };
    });
  });

  readonly linePoints = computed<LinePoint[]>(() => {
    const max = this.maxValue();
    const formatter = this.valueFormatter();
    const points = this.points();

    return points.map((point, index) => {
      const valueText = formatter(point.value);
      const labelAnchor =
        index === 0 ? 'start' : index === points.length - 1 ? 'end' : null;

      return {
        key: point.key,
        label: point.label,
        x: index * BAND_WIDTH + LEFT_PADDING,
        y: this.axisY - (point.value / max) * PLOT_HEIGHT,
        labelAnchor,
        valueText,
        tooltip: `${point.label}: ${valueText}`,
      };
    });
  });

  readonly linePath = computed(() => {
    const pts = this.linePoints();
    if (pts.length === 0) return '';
    return 'M' + pts.map((p) => `${p.x},${p.y}`).join(' L');
  });

  readonly areaPath = computed(() => {
    const pts = this.linePoints();
    if (pts.length === 0) return '';
    const line = this.linePath();
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${line} L${last.x},${this.axisY} L${first.x},${this.axisY} Z`;
  });

  readonly markerRadius = MARKER_RADIUS;
}

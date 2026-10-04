import { Component, computed, input, signal } from '@angular/core';
import { formatTick, niceMax } from '../../../utils/chart-scale';
import { ChartPoint } from '../../../utils/chart-stats';
import { areaUnder, smoothPath } from '../../../utils/chart-geometry';

export type TimeSeriesPoint = ChartPoint;

interface Mark {
  key: string;
  label: string;
  showLabel: boolean;
  bandX: number;
  cx: number;
  x: number;
  y: number;
  width: number;
  height: number;
  path: string;
  isPeak: boolean;
  valueText: string;
}

interface GridLine {
  y: number;
  label: string;
}

const DEFAULT_VIEW_WIDTH = 900;
const VIEW_HEIGHT = 250;
const TOP_PADDING = 30;
const BOTTOM_PADDING = 28;
const LEFT_PADDING = 40;
const RIGHT_PADDING = 16;
const PLOT_HEIGHT = VIEW_HEIGHT - TOP_PADDING - BOTTOM_PADDING;
const MAX_BAR_WIDTH = 34;
const MAX_AXIS_LABELS = 12;
const BAR_CORNER_RADIUS = 5;
const TOOLTIP_HEIGHT = 40;
const TICK_FRACTIONS = [
  [0, 0.25, 0.5, 0.75, 1],
  [0, 0.2, 0.4, 0.6, 0.8, 1],
  [0, 0.5, 1],
];

let nextChartId = 0;

function roundedTopPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  if (height <= 0) return '';
  const r = Math.min(radius, width / 2, height);
  return (
    `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} ` +
    `L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} ` +
    `L${x + width},${y + height} Z`
  );
}

@Component({
  selector: 'app-time-series-chart',
  templateUrl: './time-series-chart.component.html',
  styleUrl: './time-series-chart.component.css',
  host: { '[style.--series-color]': 'color()' },
})
export class TimeSeriesChartComponent {
  readonly points = input.required<TimeSeriesPoint[]>();
  readonly variant = input<'bar' | 'line'>('bar');
  readonly color = input('var(--chartColor1)');
  readonly valueFormatter = input<(value: number) => string>((value) =>
    value.toLocaleString(),
  );
  // Width in SVG units. The chart always fills its card, so a narrower
  // viewBox (for half-width cards) keeps the text at a readable size.
  readonly viewWidth = input(DEFAULT_VIEW_WIDTH);
  readonly ariaLabel = input('Chart');
  readonly emptyMessage = input('No data yet.');

  readonly id = `tsc-${nextChartId++}`;
  readonly viewHeight = VIEW_HEIGHT;
  readonly leftPadding = LEFT_PADDING;
  readonly rightEdge = computed(() => this.viewWidth() - RIGHT_PADDING);
  private readonly plotWidth = computed(
    () => this.viewWidth() - LEFT_PADDING - RIGHT_PADDING,
  );
  readonly topPadding = TOP_PADDING;
  readonly axisY = TOP_PADDING + PLOT_HEIGHT;
  readonly plotHeight = PLOT_HEIGHT;
  readonly tooltipHeight = TOOLTIP_HEIGHT;

  readonly activeIndex = signal<number | null>(null);

  readonly hasData = computed(() => this.points().length > 0);

  private readonly maxValue = computed(() =>
    niceMax(Math.max(0, ...this.points().map((p) => p.value))),
  );

  readonly bandWidth = computed(
    () => this.plotWidth() / Math.max(this.points().length, 1),
  );

  readonly gridLines = computed<GridLine[]>(() => {
    const max = this.maxValue();
    const wholeNumbers = this.points().every((p) => Number.isInteger(p.value));
    const fractions = TICK_FRACTIONS.find(
      (set) => !wholeNumbers || set.every((f) => Number.isInteger(max * f)),
    ) ?? [0, 1];
    return fractions.map((fraction) => ({
      y: TOP_PADDING + PLOT_HEIGHT * (1 - fraction),
      label: formatTick(max * fraction),
    }));
  });

  readonly marks = computed<Mark[]>(() => {
    const max = this.maxValue();
    const formatter = this.valueFormatter();
    const points = this.points();
    const band = this.bandWidth();
    const barWidth = Math.max(Math.min(band * 0.62, MAX_BAR_WIDTH), 1.5);
    const peak = Math.max(0, ...points.map((p) => p.value));
    const labelStep = Math.ceil(points.length / MAX_AXIS_LABELS);
    let peakMarked = false;

    return points.map((point, index) => {
      const bandX = LEFT_PADDING + index * band;
      const cx = bandX + band / 2;
      const height = (point.value / max) * PLOT_HEIGHT;
      const x = cx - barWidth / 2;
      const y = this.axisY - height;
      const isPeak = !peakMarked && point.value === peak && peak > 0;
      if (isPeak) peakMarked = true;

      return {
        key: point.key,
        label: point.label,
        showLabel: index % labelStep === 0,
        bandX,
        cx,
        x,
        y,
        width: barWidth,
        height,
        path: roundedTopPath(
          x,
          y,
          barWidth,
          height,
          Math.min(BAR_CORNER_RADIUS, barWidth / 3),
        ),
        isPeak,
        valueText: formatter(point.value),
      };
    });
  });

  readonly linePath = computed(() =>
    smoothPath(this.marks().map((m) => ({ x: m.cx, y: m.y }))),
  );

  readonly areaPath = computed(() =>
    areaUnder(
      this.marks().map((m) => ({ x: m.cx, y: m.y })),
      this.axisY,
    ),
  );

  readonly lastMark = computed(() => this.marks().at(-1) ?? null);

  readonly activeMark = computed(() => {
    const index = this.activeIndex();
    return index === null ? null : (this.marks()[index] ?? null);
  });

  readonly tooltip = computed(() => {
    const mark = this.activeMark();
    if (!mark) return null;
    const textLength = Math.max(mark.label.length, mark.valueText.length);
    const width = Math.max(textLength * 7.2 + 20, 64);
    const x = Math.min(
      Math.max(mark.cx - width / 2, LEFT_PADDING),
      this.rightEdge() - width,
    );
    const y = Math.max(mark.y - TOOLTIP_HEIGHT - 12, 2);
    return { x, y, width, mark };
  });

  readonly activeDescription = computed(() => {
    const mark = this.activeMark();
    return mark ? `${mark.label}: ${mark.valueText}` : '';
  });

  setActive(index: number | null): void {
    this.activeIndex.set(index);
  }

  onFocus(): void {
    if (this.activeIndex() === null) {
      this.activeIndex.set(this.points().length - 1);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.points().length;
    if (count === 0) return;
    const current = this.activeIndex() ?? count - 1;
    const next =
      event.key === 'ArrowLeft'
        ? Math.max(current - 1, 0)
        : event.key === 'ArrowRight'
          ? Math.min(current + 1, count - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? count - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    this.activeIndex.set(next);
  }
}

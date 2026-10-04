import { Component, computed, input, signal } from '@angular/core';
import { LabelValue } from '../../../utils/chart-stats';

export type DonutSlice = LabelValue;

interface Arc {
  label: string;
  value: number;
  valueText: string;
  percentText: string;
  color: string;
  dashArray: string;
  dashOffset: number;
}

const SLICE_GAP = 1.2;
const PALETTE_SIZE = 8;

export function paletteColor(index: number): string {
  return `var(--chartColor${(index % PALETTE_SIZE) + 1})`;
}

function formatPercent(fraction: number): string {
  const percent = fraction * 100;
  return percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent)}%`;
}

@Component({
  selector: 'app-donut-chart',
  templateUrl: './donut-chart.component.html',
  styleUrl: './donut-chart.component.css',
})
export class DonutChartComponent {
  readonly slices = input.required<DonutSlice[]>();
  readonly valueFormatter = input<(value: number) => string>((value) =>
    value.toLocaleString(),
  );
  readonly centerCaption = input('total');
  readonly ariaLabel = input('Donut chart');
  readonly emptyMessage = input('No data yet.');

  readonly activeIndex = signal<number | null>(null);

  readonly total = computed(() =>
    this.slices().reduce((sum, slice) => sum + slice.value, 0),
  );

  readonly arcs = computed<Arc[]>(() => {
    const total = this.total();
    const formatter = this.valueFormatter();
    const visible = this.slices().filter((s) => s.value > 0).length;
    const gap = visible > 1 ? SLICE_GAP : 0;
    let start = 0;

    return this.slices().map((slice, index) => {
      const fraction = total > 0 ? slice.value / total : 0;
      const length = fraction * 100;
      const arc = {
        label: slice.label,
        value: slice.value,
        valueText: formatter(slice.value),
        percentText: formatPercent(fraction),
        color: paletteColor(index),
        dashArray: `${Math.max(length - gap, 0)} ${100 - Math.max(length - gap, 0)}`,
        dashOffset: -(start + gap / 2),
      };
      start += length;
      return arc;
    });
  });

  readonly center = computed(() => {
    const index = this.activeIndex();
    const arc = index === null ? null : this.arcs()[index];
    return arc
      ? { value: arc.percentText, caption: arc.label }
      : {
          value: this.valueFormatter()(this.total()),
          caption: this.centerCaption(),
        };
  });

  readonly summary = computed(
    () =>
      `${this.ariaLabel()}: ` +
      this.arcs()
        .map((arc) => `${arc.label} ${arc.valueText} (${arc.percentText})`)
        .join(', '),
  );

  setActive(index: number | null): void {
    this.activeIndex.set(index);
  }
}

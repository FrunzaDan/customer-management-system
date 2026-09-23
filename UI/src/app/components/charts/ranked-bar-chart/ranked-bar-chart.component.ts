import { Component, computed, input } from '@angular/core';

export interface RankedItem {
  label: string;
  value: number;
}

interface RankedBar extends RankedItem {
  percent: number;
  valueText: string;
}

// Horizontal ranked bars — one series, so bar length alone carries the ranking and no
// legend/color-identity is needed (see the Charts tab's "no categorical color" note).
// Styled entirely off the shared .ranked-* classes in styles.css (also used by
// StockHealthChartComponent) — no scoped stylesheet needed here.
@Component({
  selector: 'app-ranked-bar-chart',
  templateUrl: './ranked-bar-chart.component.html',
})
export class RankedBarChartComponent {
  readonly items = input.required<RankedItem[]>();
  readonly valueFormatter = input<(value: number) => string>((value) =>
    value.toLocaleString(),
  );
  readonly ariaLabel = input('Ranked bar chart');
  readonly emptyMessage = input('No data yet.');

  readonly bars = computed<RankedBar[]>(() => {
    const items = this.items();
    const formatter = this.valueFormatter();
    const max = Math.max(0, ...items.map((item) => item.value));

    return items.map((item) => ({
      ...item,
      percent: max > 0 ? (item.value / max) * 100 : 0,
      valueText: formatter(item.value),
    }));
  });
}

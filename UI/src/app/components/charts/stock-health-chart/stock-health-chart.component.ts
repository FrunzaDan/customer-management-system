import { Component, computed, input } from '@angular/core';

export interface StockHealthRow {
  label: string;
  sold: number;
  inventory: number;
}

interface StockHealthBar extends StockHealthRow {
  percent: number;
  nearSellout: boolean;
}

const NEAR_SELLOUT_THRESHOLD = 85;

@Component({
  selector: 'app-stock-health-chart',
  templateUrl: './stock-health-chart.component.html',
  styleUrl: './stock-health-chart.component.css',
})
export class StockHealthChartComponent {
  readonly rows = input.required<StockHealthRow[]>();
  readonly emptyMessage = input('No data yet.');

  readonly bars = computed<StockHealthBar[]>(() =>
    this.rows().map((row) => {
      const percent =
        row.inventory > 0 ? Math.round((row.sold / row.inventory) * 100) : 0;
      return {
        ...row,
        percent,
        nearSellout: percent >= NEAR_SELLOUT_THRESHOLD,
      };
    }),
  );
}

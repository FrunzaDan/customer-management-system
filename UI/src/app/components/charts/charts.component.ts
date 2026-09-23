import { Component, computed, inject, signal } from '@angular/core';
import { ProductService } from '../../services/product.service';
import { MonthlyActivityService } from '../../services/monthly-activity.service';
import { RankedBarChartComponent } from './ranked-bar-chart/ranked-bar-chart.component';
import { StockHealthChartComponent } from './stock-health-chart/stock-health-chart.component';
import { TimeSeriesChartComponent } from './time-series-chart/time-series-chart.component';
import {
  cumulativePoints,
  monthlyToPoints,
  rankByCategory,
  stockHealthByCategory,
  yearlyToPoints,
} from './charts-data';

const TOP_CATEGORY_COUNT = 7;
const TOP_PRODUCT_COUNT = 10;

export type TimeRange = 'monthly' | 'yearly';

@Component({
  selector: 'app-charts',
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.css',
  imports: [
    RankedBarChartComponent,
    StockHealthChartComponent,
    TimeSeriesChartComponent,
  ],
})
export class ChartsComponent {
  private readonly productService = inject(ProductService);
  private readonly monthlyActivityService = inject(MonthlyActivityService);

  readonly products = this.productService.products;
  readonly productsLoading = this.productService.loading;
  readonly productsError = this.productService.error;

  readonly activity = this.monthlyActivityService.activity;
  readonly activityLoading = this.monthlyActivityService.loading;
  readonly activityError = this.monthlyActivityService.error;

  // Product-catalogue charts — plain computeds off ProductService, same source the
  // Products tab already loads.
  readonly categorySold = computed(() =>
    rankByCategory(this.products(), (p) => p.soldQuantity, TOP_CATEGORY_COUNT),
  );

  readonly bestSellers = computed(() =>
    [...this.products()]
      .sort((a, b) => b.soldQuantity - a.soldQuantity)
      .slice(0, TOP_PRODUCT_COUNT)
      .map((p) => ({ label: p.name, value: p.soldQuantity })),
  );

  readonly stockHealth = computed(() => stockHealthByCategory(this.products()));

  readonly revenueByCategory = computed(() =>
    rankByCategory(
      this.products(),
      (p) => p.price * p.soldQuantity,
      TOP_CATEGORY_COUNT,
    ),
  );

  // Time-series charts — off MonthlyActivityService. Each bar chart has its own
  // Monthly/Yearly toggle; cumulative growth always shows the full monthly run.
  readonly customerGrowthRange = signal<TimeRange>('monthly');
  readonly productsSoldRange = signal<TimeRange>('monthly');

  readonly customerGrowthPoints = computed(() =>
    this.customerGrowthRange() === 'monthly'
      ? monthlyToPoints(this.activity().customerCreations)
      : yearlyToPoints(this.activity().customerCreations),
  );

  readonly productsSoldPoints = computed(() =>
    this.productsSoldRange() === 'monthly'
      ? monthlyToPoints(this.activity().productPurchases)
      : yearlyToPoints(this.activity().productPurchases),
  );

  readonly cumulativeGrowthPoints = computed(() =>
    cumulativePoints(this.activity().customerCreations),
  );

  readonly currencyFormatter = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 2 });

  constructor() {
    this.productService.loadProducts();
    this.monthlyActivityService.loadMonthlyActivity();
  }

  setCustomerGrowthRange(range: TimeRange): void {
    this.customerGrowthRange.set(range);
  }

  setProductsSoldRange(range: TimeRange): void {
    this.productsSoldRange.set(range);
  }
}

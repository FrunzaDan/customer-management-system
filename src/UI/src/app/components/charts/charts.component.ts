import { Component, computed, inject, signal } from '@angular/core';
import { ProductService } from '../../services/product.service';
import { CustomerInsightsService } from '../../services/customer-insights.service';
import { CustomerStatus } from '../../interfaces/customer';
import { RankedBarChartComponent } from './ranked-bar-chart/ranked-bar-chart.component';
import { StockHealthChartComponent } from './stock-health-chart/stock-health-chart.component';
import { TimeSeriesChartComponent } from './time-series-chart/time-series-chart.component';
import { DonutChartComponent } from './donut-chart/donut-chart.component';
import { KpiTileComponent } from './kpi-tile/kpi-tile.component';
import { RonPipe } from '../../pipes/ron.pipe';
import {
  average,
  ChartPoint,
  cumulativeYearlyPoints,
  median,
  monthlyToPoints,
  yearlyToPoints,
} from '../../utils/chart-stats';
import {
  ageDistribution,
  enrollmentCounts,
  genderSlices,
  purchasesPerCustomer,
  rankByCategory,
  salesCounts,
  statusSlices,
  stockHealthByCategory,
  tenureDistribution,
  tenureYears,
  topCounties,
} from './charts-data';

const TOP_CATEGORY_COUNT = 7;
const TOP_PRODUCT_COUNT = 10;
const TOP_COUNTY_COUNT = 8;

export type TimeRange = 'monthly' | 'yearly';

function peakOf(points: ChartPoint[]): ChartPoint | null {
  return points.reduce<ChartPoint | null>(
    (best, point) =>
      point.value > 0 && (!best || point.value > best.value) ? point : best,
    null,
  );
}

@Component({
  selector: 'app-charts',
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.css',
  imports: [
    DonutChartComponent,
    KpiTileComponent,
    RankedBarChartComponent,
    StockHealthChartComponent,
    TimeSeriesChartComponent,
  ],
  providers: [RonPipe],
})
export class ChartsComponent {
  private readonly productService = inject(ProductService);
  private readonly insightsService = inject(CustomerInsightsService);
  private readonly ron = inject(RonPipe);
  private readonly today = new Date();

  readonly products = this.productService.products;
  readonly productsLoading = this.productService.loading;
  readonly productsError = this.productService.error;

  readonly insights = this.insightsService.insights;
  readonly insightsLoading = this.insightsService.loading;
  readonly insightsError = this.insightsService.error;

  readonly customers = computed(() => this.insights().customers);
  readonly monthlySales = computed(() => this.insights().monthlySales);

  // KPIs
  readonly customerCount = computed(() => this.customers().length);
  readonly activeShare = computed(() => {
    const total = this.customerCount();
    if (total === 0) return null;
    const active = this.customers().filter(
      (c) => c.status === CustomerStatus.Active,
    ).length;
    return (active / total) * 100;
  });
  readonly activeCaption = computed(() => {
    const active = this.customers().filter(
      (c) => c.status === CustomerStatus.Active,
    ).length;
    return `${active.toLocaleString()} active customers`;
  });
  readonly totalRevenue = computed(() =>
    this.monthlySales().reduce((sum, month) => sum + month.revenue, 0),
  );
  readonly totalPurchases = computed(() =>
    this.monthlySales().reduce((sum, month) => sum + month.purchaseCount, 0),
  );
  readonly purchasesCaption = computed(() => {
    const perCustomer = average(this.customers().map((c) => c.purchaseCount));
    return perCustomer === null
      ? null
      : `${perCustomer.toFixed(1)} per customer`;
  });
  readonly averageTenure = computed(() =>
    average(tenureYears(this.customers(), this.today)),
  );
  readonly tenureCaption = computed(() => {
    const middle = median(tenureYears(this.customers(), this.today));
    return middle === null ? null : `median ${middle.toFixed(1)} yrs`;
  });

  readonly growthTrend = computed(() =>
    cumulativeYearlyPoints(this.enrollments()).map((p) => p.value),
  );
  readonly revenueTrend = computed(() =>
    monthlyToPoints(salesCounts(this.monthlySales(), (m) => m.revenue)).map(
      (p) => p.value,
    ),
  );

  // Customer base
  private readonly enrollments = computed(() =>
    enrollmentCounts(this.customers()),
  );

  readonly customerGrowthRange = signal<TimeRange>('yearly');
  readonly customerGrowthPoints = computed(() =>
    this.customerGrowthRange() === 'monthly'
      ? monthlyToPoints(this.enrollments())
      : yearlyToPoints(this.enrollments()),
  );
  readonly busiestEnrollmentYear = computed(() =>
    peakOf(yearlyToPoints(this.enrollments())),
  );
  readonly cumulativeGrowthPoints = computed(() =>
    cumulativeYearlyPoints(this.enrollments()),
  );

  readonly statusSlices = computed(() => statusSlices(this.customers()));
  readonly genderSlices = computed(() => genderSlices(this.customers()));
  readonly ageDistribution = computed(() =>
    ageDistribution(this.customers(), this.today),
  );
  readonly largestAgeGroup = computed(() => peakOf(this.ageDistribution()));
  readonly tenureDistribution = computed(() =>
    tenureDistribution(this.customers(), this.today),
  );
  readonly loyalShare = computed(() => {
    const total = this.customerCount();
    if (total === 0) return null;
    const loyal = this.tenureDistribution()
      .slice(3)
      .reduce((sum, band) => sum + band.value, 0);
    return Math.round((loyal / total) * 100);
  });
  readonly topCounties = computed(() =>
    topCounties(this.customers(), TOP_COUNTY_COUNT),
  );
  readonly purchasesPerCustomer = computed(() =>
    purchasesPerCustomer(this.customers()),
  );
  readonly repeatBuyerShare = computed(() => {
    const total = this.customerCount();
    if (total === 0) return null;
    const repeat = this.customers().filter((c) => c.purchaseCount >= 2).length;
    return Math.round((repeat / total) * 100);
  });

  // Sales & catalogue
  readonly salesRange = signal<TimeRange>('monthly');
  readonly revenuePoints = computed(() => {
    const counts = salesCounts(this.monthlySales(), (m) => m.revenue);
    return this.salesRange() === 'monthly'
      ? monthlyToPoints(counts)
      : yearlyToPoints(counts);
  });

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

  readonly formatRon = (value: number): string =>
    this.ron.transform(value, '1.0-0');
  readonly formatPercent = (value: number): string => `${Math.round(value)}%`;
  readonly formatYears = (value: number): string => `${value.toFixed(1)} yrs`;

  constructor() {
    this.productService.loadProducts();
    this.insightsService.loadInsights();
  }

  setCustomerGrowthRange(range: TimeRange): void {
    this.customerGrowthRange.set(range);
  }

  setSalesRange(range: TimeRange): void {
    this.salesRange.set(range);
  }
}

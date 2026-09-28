import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../interfaces/generic-response';
import { CustomerInsights } from '../interfaces/customer-insights';
import { extractErrorMessage } from '../utils/extract-error-message';

const EMPTY_INSIGHTS: CustomerInsights = { customers: [], monthlySales: [] };

@Injectable({
  providedIn: 'root',
})
export class CustomerInsightsService {
  private readonly apiUrl = `${environment.apiUrl}/api/customer/insights`;

  private readonly requested = signal(false);

  private readonly insightsResource = httpResource<
    GenericResponse<CustomerInsights>
  >(() => (this.requested() ? this.apiUrl : undefined));

  readonly insights = computed(() =>
    this.insightsResource.hasValue()
      ? (this.insightsResource.value().data ?? EMPTY_INSIGHTS)
      : EMPTY_INSIGHTS,
  );
  readonly loading = this.insightsResource.isLoading;
  readonly error = computed(() => {
    const error = this.insightsResource.error();
    return error ? extractErrorMessage(error as HttpErrorResponse) : null;
  });

  loadInsights(): void {
    if (!this.requested()) {
      this.requested.set(true);
    } else {
      this.insightsResource.reload();
    }
  }
}

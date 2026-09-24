import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../interfaces/generic-response';
import { MonthlyActivity } from '../interfaces/monthly-activity';
import { extractErrorMessage } from '../utils/extract-error-message';

@Injectable({
  providedIn: 'root',
})
export class MonthlyActivityService {
  private readonly apiUrl = `${environment.apiUrl}/api/customer/monthly-activity`;

  // No request is made until loadMonthlyActivity() is first called, same reasoning
  // as ProductService.
  private readonly requested = signal(false);

  private readonly activityResource = httpResource<
    GenericResponse<MonthlyActivity>
  >(() => (this.requested() ? this.apiUrl : undefined));

  private readonly empty: MonthlyActivity = {
    customerCreations: [],
    productPurchases: [],
  };

  readonly activity = computed(() =>
    this.activityResource.hasValue()
      ? (this.activityResource.value().data ?? this.empty)
      : this.empty,
  );
  readonly loading = this.activityResource.isLoading;
  readonly error = computed(() => {
    const error = this.activityResource.error();
    return error ? extractErrorMessage(error as HttpErrorResponse) : null;
  });

  loadMonthlyActivity(): void {
    if (!this.requested()) {
      this.requested.set(true);
    }
  }
}

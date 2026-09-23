import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../interfaces/generic-response';
import { MonthlyActivity } from '../interfaces/monthly-activity';
import { extractErrorMessage } from '../utils/extract-error-message';
import { HttpHeaderService } from './http-header-service';

@Injectable({
  providedIn: 'root',
})
export class MonthlyActivityService {
  private readonly API_URL = `${environment.apiUrl}/api/customer/monthly-activity`;
  private readonly httpHeaderService = inject(HttpHeaderService);

  // No request is made until loadMonthlyActivity() is first called, same reasoning
  // as ProductService.
  private readonly requested = signal(false);

  private readonly activity = httpResource<GenericResponse<MonthlyActivity>>(() =>
    this.requested()
      ? {
          url: this.API_URL,
          headers: this.httpHeaderService.getHeadersWithTokenSet(),
        }
      : undefined,
  );

  private readonly empty: MonthlyActivity = { customerRegistrations: [], productPurchases: [] };

  public readonly activitySignal = computed(() =>
    this.activity.hasValue() ? (this.activity.value().data ?? this.empty) : this.empty,
  );
  public readonly loadingSignal = this.activity.isLoading;
  public readonly errorSignal = computed(() => {
    const error = this.activity.error();
    return error ? extractErrorMessage(error as HttpErrorResponse) : null;
  });

  loadMonthlyActivity(): void {
    if (!this.requested()) {
      this.requested.set(true);
    }
  }
}

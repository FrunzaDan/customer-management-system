import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  httpResource,
} from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../interfaces/generic-response';
import { Purchase } from '../interfaces/purchase';
import { extractErrorMessage } from '../utils/extract-error-message';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class PurchaseService {
  private readonly apiUrl = `${environment.apiUrl}/api/customer`;
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  private readonly customerId = signal<string | undefined>(undefined);

  // Same shape as AuditLogService: the request is a function of `customerId`, so a
  // new customerId cancels the in-flight request, and nothing is fetched until one is set.
  private readonly purchasesResource = httpResource<
    GenericResponse<Purchase[]>
  >(() => {
    const customerId = this.customerId();
    if (!customerId) return undefined;
    return {
      url: `${this.apiUrl}/purchases`,
      params: { customerId: customerId },
    };
  });

  // hasValue() guards the read: value() throws while the resource is in error.
  readonly entries = computed(() =>
    this.purchasesResource.hasValue()
      ? (this.purchasesResource.value().data ?? [])
      : [],
  );
  readonly loading = this.purchasesResource.isLoading;
  readonly error = computed(() => {
    const error = this.purchasesResource.error();
    return error ? extractErrorMessage(error as HttpErrorResponse) : null;
  });

  loadPurchases(customerId: string): void {
    if (this.customerId() === customerId) {
      // Same customer (e.g. right after recording a purchase) — the request itself
      // hasn't changed, so ask for a fresh copy.
      this.purchasesResource.reload();
    } else {
      this.customerId.set(customerId);
    }
  }

  purchaseProduct(
    customerId: string,
    productId: string,
  ): Observable<GenericResponse<object>> {
    return this.purchaseProductSilently(customerId, productId).pipe(
      tap(() => this.notificationService.show('Purchase recorded.')),
    );
  }

  /**
   * Same endpoint as {@link purchaseProduct}, without the per-call success toast — for
   * callers (bulk test-data generation) that show one summary notification instead of
   * one per request.
   */
  purchaseProductSilently(
    customerId: string,
    productId: string,
  ): Observable<GenericResponse<object>> {
    const params = new HttpParams()
      .set('customerId', customerId)
      .set('productId', productId);

    return this.http.post<GenericResponse<object>>(
      `${this.apiUrl}/purchase`,
      null,
      { params },
    );
  }
}

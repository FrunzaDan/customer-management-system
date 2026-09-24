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

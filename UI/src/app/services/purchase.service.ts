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
import { HttpHeaderService } from './http-header-service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class PurchaseService {
  private readonly API_URL = `${environment.CustomerManagementSystemAPI}/api/Customer`;
  private readonly http = inject(HttpClient);
  private readonly httpHeaderService = inject(HttpHeaderService);
  private readonly notificationService = inject(NotificationService);

  private readonly customerGuid = signal<string | undefined>(undefined);

  // Same shape as AuditLogService: the request is a function of `customerGuid`, so a
  // new guid cancels the in-flight request, and nothing is fetched until one is set.
  private readonly purchases = httpResource<GenericResponse<Purchase[]>>(() => {
    const guid = this.customerGuid();
    if (!guid) return undefined;
    return {
      url: `${this.API_URL}/purchases`,
      params: { customerGuid: guid },
      headers: this.httpHeaderService.getHeadersWithTokenSet(),
    };
  });

  // hasValue() guards the read: value() throws while the resource is in error.
  public readonly entriesSignal = computed(() =>
    this.purchases.hasValue() ? (this.purchases.value().data ?? []) : [],
  );
  public readonly loadingSignal = this.purchases.isLoading;
  public readonly errorSignal = computed(() => {
    const error = this.purchases.error();
    return error ? extractErrorMessage(error as HttpErrorResponse) : null;
  });

  loadPurchases(customerGuid: string): void {
    if (this.customerGuid() === customerGuid) {
      // Same customer (e.g. right after recording a purchase) — the request itself
      // hasn't changed, so ask for a fresh copy.
      this.purchases.reload();
    } else {
      this.customerGuid.set(customerGuid);
    }
  }

  purchaseProduct(
    customerGuid: string,
    productGuid: string,
  ): Observable<GenericResponse<object>> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    const params = new HttpParams()
      .set('customerGuid', customerGuid)
      .set('productGuid', productGuid);

    return this.http
      .post<GenericResponse<object>>(`${this.API_URL}/purchase`, null, {
        headers,
        params,
      })
      .pipe(tap(() => this.notificationService.show('Purchase recorded.')));
  }
}

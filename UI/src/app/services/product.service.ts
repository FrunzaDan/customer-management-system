import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../interfaces/generic-response';
import { Product } from '../interfaces/product';
import { extractErrorMessage } from '../utils/extract-error-message';
import { HttpHeaderService } from './http-header-service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly API_URL = `${environment.CustomerManagementSystemAPI}/api/Customer/products`;
  private readonly http = inject(HttpClient);
  private readonly httpHeaderService = inject(HttpHeaderService);

  // No request is made until loadProducts() is first called (returning undefined
  // idles the resource), so merely injecting the service never hits the API.
  private readonly requested = signal(false);

  private readonly products = httpResource<GenericResponse<Product[]>>(() =>
    this.requested()
      ? {
          url: this.API_URL,
          headers: this.httpHeaderService.getHeadersWithTokenSet(),
        }
      : undefined,
  );

  // hasValue() guards the read: value() throws while the resource is in error.
  public readonly productsSignal = computed(() =>
    this.products.hasValue() ? (this.products.value().data ?? []) : [],
  );
  public readonly loadingSignal = this.products.isLoading;
  public readonly errorSignal = computed(() => {
    const error = this.products.error();
    return error ? extractErrorMessage(error as HttpErrorResponse) : null;
  });

  /**
   * One-shot fetch of the current catalogue, independent of the `httpResource` above —
   * for imperative callers (bulk test-data generation) that need the list as a value
   * *now*, rather than a signal that fills in later.
   */
  fetchProducts(): Observable<Product[]> {
    return this.http
      .get<GenericResponse<Product[]>>(this.API_URL, {
        headers: this.httpHeaderService.getHeadersWithTokenSet(),
      })
      .pipe(map((response) => response?.data ?? []));
  }

  loadProducts(): void {
    if (this.requested()) {
      // Already fetched once — stock changes with every purchase, so ask again.
      this.products.reload();
    } else {
      this.requested.set(true);
    }
  }
}

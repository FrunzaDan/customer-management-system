import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  httpResource,
} from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../interfaces/generic-response';
import { CreateProductRequest, Product } from '../interfaces/product';
import { ProductDetails } from '../interfaces/product-details';
import { extractErrorMessage } from '../utils/extract-error-message';
import { NotificationService } from './notification.service';

// Every /api/product call (the catalogue, one product's details, adding a product),
// in one service like OfficeService in the employee app.
@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly apiUrl = `${environment.apiUrl}/api/product`;
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  // No request is made until loadProducts() is first called (returning undefined
  // idles the resource), so merely injecting the service never hits the API.
  private readonly requested = signal(false);

  private readonly productsResource = httpResource<GenericResponse<Product[]>>(
    () => (this.requested() ? `${this.apiUrl}/all` : undefined),
  );

  // hasValue() guards the read: value() throws while the resource is in error.
  readonly products = computed(() =>
    this.productsResource.hasValue()
      ? (this.productsResource.value().data ?? [])
      : [],
  );
  readonly loading = this.productsResource.isLoading;
  readonly error = computed(() => {
    const error = this.productsResource.error();
    return error ? extractErrorMessage(error as HttpErrorResponse) : null;
  });

  loadProducts(): void {
    if (this.requested()) {
      // Already fetched once — stock changes with every purchase, so ask again.
      this.productsResource.reload();
    } else {
      this.requested.set(true);
    }
  }

  /**
   * One-shot fetch of the current catalogue, independent of the `httpResource` above —
   * for imperative callers (bulk test-data generation) that need the list as a value
   * *now*, rather than a signal that fills in later.
   */
  fetchProducts(): Observable<Product[]> {
    return this.http
      .get<GenericResponse<Product[]>>(`${this.apiUrl}/all`)
      .pipe(map((response) => response?.data ?? []));
  }

  /** One product and its buyers — for the product details page, reached directly by URL. */
  getProductDetails(productId: string): Observable<ProductDetails> {
    const params = new HttpParams().set('productId', productId);
    return this.http
      .get<GenericResponse<ProductDetails>>(`${this.apiUrl}/get`, { params })
      .pipe(
        map((response) => {
          if (!response.data) throw new Error('Product not found.');
          return response.data;
        }),
      );
  }

  // On success, `data` is the new product's server-generated GUID.
  createProduct(
    product: CreateProductRequest,
  ): Observable<GenericResponse<string>> {
    return this.http
      .post<GenericResponse<string>>(`${this.apiUrl}/create`, product)
      .pipe(
        tap(() => this.notificationService.show('Product added successfully.')),
      );
  }
}

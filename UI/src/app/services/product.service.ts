import {
  HttpClient,
  HttpErrorResponse,
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

// Every product call (the catalogue, one product's details, adding a product), in one
// service like CustomerService.
@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly API_URL = `${environment.apiUrl}/api/customer`;
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  // No request is made until loadProducts() is first called (returning undefined
  // idles the resource), so merely injecting the service never hits the API.
  private readonly requested = signal(false);

  private readonly productsResource = httpResource<GenericResponse<Product[]>>(
    () => (this.requested() ? `${this.API_URL}/products` : undefined),
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

  private readonly productId = signal<string | undefined>(undefined);

  // Same shape as AuditLogService: the request is a function of `productId`, so a new
  // productId cancels the in-flight request, and nothing is fetched until one is set.
  private readonly detailsResource = httpResource<
    GenericResponse<ProductDetails>
  >(() => {
    const productId = this.productId();
    if (!productId) return undefined;
    return {
      url: `${this.API_URL}/product-details`,
      params: { productId: productId },
    };
  });

  readonly details = computed(() =>
    this.detailsResource.hasValue()
      ? (this.detailsResource.value().data ?? null)
      : null,
  );
  readonly detailsLoading = this.detailsResource.isLoading;
  readonly detailsError = computed(() => {
    const error = this.detailsResource.error();
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
      .get<GenericResponse<Product[]>>(`${this.API_URL}/products`, {})
      .pipe(map((response) => response?.data ?? []));
  }

  loadProductDetails(productId: string): void {
    if (this.productId() === productId) {
      this.detailsResource.reload();
    } else {
      this.productId.set(productId);
    }
  }

  // On success, `data` is the new product's server-generated GUID.
  createProduct(
    product: CreateProductRequest,
  ): Observable<GenericResponse<string>> {
    return this.http
      .post<GenericResponse<string>>(`${this.API_URL}/product`, product)
      .pipe(
        tap(() => this.notificationService.show('Product added successfully.')),
      );
  }
}

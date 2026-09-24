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

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly apiUrl = `${environment.apiUrl}/api/product`;
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  private readonly requested = signal(false);

  private readonly productsResource = httpResource<GenericResponse<Product[]>>(
    () => (this.requested() ? `${this.apiUrl}/all` : undefined),
  );

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
      this.productsResource.reload();
    } else {
      this.requested.set(true);
    }
  }

  fetchProducts(): Observable<Product[]> {
    return this.http
      .get<GenericResponse<Product[]>>(`${this.apiUrl}/all`)
      .pipe(map((response) => response?.data ?? []));
  }

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

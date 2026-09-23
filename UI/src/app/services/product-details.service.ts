import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../interfaces/generic-response';
import { ProductDetails } from '../interfaces/product-details';
import { extractErrorMessage } from '../utils/extract-error-message';
import { HttpHeaderService } from './http-header.service';

@Injectable({
  providedIn: 'root',
})
export class ProductDetailsService {
  private readonly API_URL = `${environment.apiUrl}/api/customer/product-details`;
  private readonly httpHeaderService = inject(HttpHeaderService);

  private readonly productId = signal<string | undefined>(undefined);

  // Same shape as AuditLogService: the request is a function of `productId`, so a new
  // productId cancels the in-flight request, and nothing is fetched until one is set.
  private readonly detailsResource = httpResource<GenericResponse<ProductDetails>>(
    () => {
      const productId = this.productId();
      if (!productId) return undefined;
      return {
        url: this.API_URL,
        params: { productId: productId },
        headers: this.httpHeaderService.getHeadersWithTokenSet(),
      };
    },
  );

  // hasValue() guards the read: value() throws while the resource is in error.
  readonly details = computed(() =>
    this.detailsResource.hasValue() ? (this.detailsResource.value().data ?? null) : null,
  );
  readonly loading = this.detailsResource.isLoading;
  readonly error = computed(() => {
    const error = this.detailsResource.error();
    return error ? extractErrorMessage(error as HttpErrorResponse) : null;
  });

  loadProductDetails(productId: string): void {
    if (this.productId() === productId) {
      this.detailsResource.reload();
    } else {
      this.productId.set(productId);
    }
  }
}

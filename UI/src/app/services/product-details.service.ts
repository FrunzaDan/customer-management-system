import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../interfaces/generic-response';
import { ProductDetails } from '../interfaces/product-details';
import { extractErrorMessage } from '../utils/extract-error-message';
import { HttpHeaderService } from './http-header-service';

@Injectable({
  providedIn: 'root',
})
export class ProductDetailsService {
  private readonly API_URL = `${environment.CustomerManagementSystemAPI}/api/Customer/productDetails`;
  private readonly httpHeaderService = inject(HttpHeaderService);

  private readonly productGuid = signal<string | undefined>(undefined);

  // Same shape as AuditLogService: the request is a function of `productGuid`, so a new
  // guid cancels the in-flight request, and nothing is fetched until one is set.
  private readonly details = httpResource<GenericResponse<ProductDetails>>(
    () => {
      const guid = this.productGuid();
      if (!guid) return undefined;
      return {
        url: this.API_URL,
        params: { productGuid: guid },
        headers: this.httpHeaderService.getHeadersWithTokenSet(),
      };
    },
  );

  // hasValue() guards the read: value() throws while the resource is in error.
  public readonly detailsSignal = computed(() =>
    this.details.hasValue() ? (this.details.value().data ?? null) : null,
  );
  public readonly loadingSignal = this.details.isLoading;
  public readonly errorSignal = computed(() => {
    const error = this.details.error();
    return error ? extractErrorMessage(error as HttpErrorResponse) : null;
  });

  loadProductDetails(productGuid: string): void {
    if (this.productGuid() === productGuid) {
      this.details.reload();
    } else {
      this.productGuid.set(productGuid);
    }
  }
}

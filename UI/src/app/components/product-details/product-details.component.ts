import {
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { RonPipe } from '../../pipes/ron.pipe';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { extractErrorMessage } from '../../utils/extract-error-message';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css',
  imports: [DatePipe, RonPipe, RouterLink],
})
export class ProductDetailsComponent {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  readonly productId = input<string>();

  private readonly detailsResource = rxResource({
    params: () => this.productId(),
    stream: ({ params: productId }) =>
      this.productService.getProductDetails(productId),
  });
  readonly details = computed(() =>
    this.detailsResource.hasValue() ? this.detailsResource.value() : null,
  );
  readonly loading = this.detailsResource.isLoading;
  readonly loadError = computed(() => {
    const error = this.detailsResource.error();
    return error
      ? extractErrorMessage(
          error as HttpErrorResponse,
          'Failed to load the product',
        )
      : null;
  });

  readonly product = computed(() => this.details()?.product ?? null);
  readonly buyers = computed(() => this.details()?.buyers ?? []);

  readonly unlistedSales = computed(() =>
    Math.max(0, (this.product()?.soldQuantity ?? 0) - this.buyers().length),
  );

  constructor() {
    effect(() => {
      if (!this.productId())
        untracked(() => this.router.navigate(['/products']));
    });
  }

  buyerName(buyer: {
    customerFirstName: string;
    customerLastName: string;
  }): string {
    return `${buyer.customerFirstName ?? ''} ${buyer.customerLastName ?? ''}`.trim();
  }
}

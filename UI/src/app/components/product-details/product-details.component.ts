import {
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RonPipe } from '../../pipes/ron.pipe';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css',
  imports: [DatePipe, RonPipe, RouterLink],
})
export class ProductDetailsComponent {
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  // Bound from the `:productId` route param by withComponentInputBinding() in app.config.ts.
  readonly productId = input<string>();

  readonly details = this.productService.details;
  readonly isLoading = this.productService.detailsLoading;
  readonly errorMessage = this.productService.detailsError;

  readonly product = computed(() => this.details()?.product ?? null);
  readonly buyers = computed(() => this.details()?.buyers ?? []);

  // Sales whose buyer is no longer on record (deleted customers): sold is derived from
  // stock, but the buyers list only has customers that still exist.
  readonly unlistedSales = computed(() =>
    Math.max(0, (this.product()?.soldQuantity ?? 0) - this.buyers().length),
  );

  constructor() {
    // (Re)load whenever the id in the URL changes; no id means nothing to show.
    effect(() => {
      const id = this.productId();
      untracked(() => {
        if (id) {
          this.productService.loadProductDetails(id);
        } else {
          this.router.navigate(['/products']);
        }
      });
    });
  }

  buyerName(buyer: {
    customerFirstName: string;
    customerLastName: string;
  }): string {
    return `${buyer.customerFirstName ?? ''} ${buyer.customerLastName ?? ''}`.trim();
  }
}

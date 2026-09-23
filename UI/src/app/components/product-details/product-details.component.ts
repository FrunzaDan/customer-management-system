import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductDetailsService } from '../../services/product-details.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css',
  imports: [DatePipe, DecimalPipe, RouterLink],
})
export class ProductDetailsComponent {
  private readonly productDetailsService = inject(ProductDetailsService);
  private readonly router = inject(Router);

  // Bound straight from `?id=` by withComponentInputBinding() in app.config.ts.
  readonly id = input<string>();

  readonly details = this.productDetailsService.detailsSignal;
  readonly isLoading = this.productDetailsService.loadingSignal;
  readonly errorMessage = this.productDetailsService.errorSignal;

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
      const id = this.id();
      untracked(() => {
        if (id) {
          this.productDetailsService.loadProductDetails(id);
        } else {
          this.router.navigate(['/products']);
        }
      });
    });
  }

  buyerName(buyer: { customerFirstName: string; customerLastName: string }): string {
    return `${buyer.customerFirstName ?? ''} ${buyer.customerLastName ?? ''}`.trim();
  }
}

import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  imports: [DecimalPipe, RouterLink],
})
export class ProductsComponent {
  private readonly productService = inject(ProductService);

  readonly products = this.productService.productsSignal;
  readonly isLoading = this.productService.loadingSignal;
  readonly errorMessage = this.productService.errorSignal;

  constructor() {
    // Stock changes with every purchase, so always fetch fresh on entering the page.
    this.productService.loadProducts();
  }
}

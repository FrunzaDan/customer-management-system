import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../interfaces/product';
import { ProductService } from '../../services/product.service';

export type ProductSortColumn =
  | 'name'
  | 'category'
  | 'depot'
  | 'price'
  | 'sold'
  | 'inventory'
  | 'left';

// How each column reads a comparable value off a product.
const SORT_VALUES: Record<ProductSortColumn, (product: Product) => string | number> = {
  name: (p) => p.name,
  category: (p) => p.category,
  depot: (p) => p.depot,
  price: (p) => p.price,
  sold: (p) => p.soldQuantity,
  inventory: (p) => p.inventoryQuantity,
  left: (p) => p.stockQuantity,
};

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

  // Unlike the customer list (paged, so sorted in SQL), the whole 50-product catalogue is
  // already loaded, so sorting happens here. Until a header is clicked (`null`), rows keep
  // the API's category/name order.
  readonly sortColumn = signal<ProductSortColumn | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly sortedProducts = computed(() => {
    const products = this.products();
    const column = this.sortColumn();
    if (!column) return products;

    const value = SORT_VALUES[column];
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    // Array.sort is stable, so equal values keep the API order (category, name).
    return [...products].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      const order =
        typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return order * direction;
    });
  });

  readonly tableCaption = computed(() => {
    const column = this.sortColumn();
    const base = 'Products with price, units sold, units originally stocked and units left';
    return column
      ? `${base}, sorted by ${column} ${this.sortDirection() === 'asc' ? 'ascending' : 'descending'}`
      : base;
  });

  constructor() {
    // Stock changes with every purchase, so always fetch fresh on entering the page.
    this.productService.loadProducts();
  }

  // Exposed on the <th> so assistive tech announces the current sort.
  ariaSort(column: ProductSortColumn): 'ascending' | 'descending' | 'none' {
    if (this.sortColumn() !== column) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  setSort(column: ProductSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }
}

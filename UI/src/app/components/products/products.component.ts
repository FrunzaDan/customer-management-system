import { Component, computed, inject, signal } from '@angular/core';
import { RonPipe } from '../../pipes/ron.pipe';
import { RouterLink } from '@angular/router';
import { Product } from '../../interfaces/product';
import { ProductService } from '../../services/product.service';

export type ProductSortColumn =
  'name' | 'category' | 'warehouse' | 'price' | 'sold' | 'inventory' | 'left';

const SORT_VALUES: Record<
  ProductSortColumn,
  (product: Product) => string | number
> = {
  name: (p) => p.name,
  category: (p) => p.category,
  warehouse: (p) => p.warehouse,
  price: (p) => p.price,
  sold: (p) => p.soldQuantity,
  inventory: (p) => p.initialQuantity,
  left: (p) => p.quantityOnHand,
};

const SORT_LABELS: Record<ProductSortColumn, string> = {
  name: 'product',
  category: 'category',
  warehouse: 'warehouse',
  price: 'price',
  sold: 'units sold',
  inventory: 'units originally stocked',
  left: 'units left',
};

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  imports: [RonPipe, RouterLink],
})
export class ProductsComponent {
  private readonly productService = inject(ProductService);

  readonly products = this.productService.products;
  readonly loading = this.productService.loading;
  readonly loadError = this.productService.error;

  readonly sortColumn = signal<ProductSortColumn | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly sortedProducts = computed(() => {
    const products = this.products();
    const column = this.sortColumn();
    if (!column) return products;

    const value = SORT_VALUES[column];
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return [...products].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      const order =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y));
      return order * direction;
    });
  });

  readonly tableCaption = computed(() => {
    const column = this.sortColumn();
    const base =
      'Products with price, units sold, units originally stocked and units left';
    return column
      ? `${base}, sorted by ${SORT_LABELS[column]} ${this.sortDirection() === 'asc' ? 'ascending' : 'descending'}`
      : base;
  });

  constructor() {
    this.productService.loadProducts();
  }

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

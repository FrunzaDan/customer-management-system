export interface Product {
  productId: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  initialQuantity: number;
  quantityOnHand: number;
  soldQuantity: number;
  warehouse: string;
}

export type CreateProductRequest = Pick<
  Product,
  'name' | 'category' | 'price' | 'initialQuantity' | 'warehouse'
> & { description: string | null };

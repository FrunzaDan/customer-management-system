export interface Product {
  productId: string;
  name: string;
  category: string;
  // null when the product has none.
  description: string | null;
  price: number;
  // Units originally stocked (never changes).
  initialQuantity: number;
  // Units left on hand.
  quantityOnHand: number;
  // Units sold: initialQuantity - quantityOnHand, derived by the API so the three numbers
  // always add up, even after a customer (and their purchase rows) is deleted.
  soldQuantity: number;
  // The warehouse (warehouse) the stock is held in.
  warehouse: string;
}

// POST /api/product/create. No productId (the DB generates it and the response returns it), and
// no stock/sold numbers: a new product starts fully stocked.
export type CreateProductRequest = Pick<
  Product,
  'name' | 'category' | 'price' | 'initialQuantity' | 'warehouse'
> & { description: string | null };

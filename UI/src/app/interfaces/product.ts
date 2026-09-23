export interface Product {
  guid: string;
  name: string;
  category: string;
  // Optional; the API omits it when there is none.
  comment?: string;
  price: number;
  // Units originally stocked (never changes).
  inventoryQuantity: number;
  // Units left on hand.
  stockQuantity: number;
  // Units sold: inventoryQuantity - stockQuantity, derived by the API so the three numbers
  // always add up, even after a customer (and their purchase rows) is deleted.
  soldQuantity: number;
  // The depot (warehouse) the stock is held in.
  depot: string;
}

// POST /api/Customer/product. No guid (the DB generates it and the response returns it), and
// no stock/sold numbers: a new product starts fully stocked.
export type CreateProductRequest = Pick<
  Product,
  'name' | 'category' | 'price' | 'inventoryQuantity' | 'depot'
> & { comment: string | null };

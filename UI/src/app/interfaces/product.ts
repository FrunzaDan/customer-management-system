export interface Product {
  guid: string;
  name: string;
  category: string;
  comment: string | null;
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

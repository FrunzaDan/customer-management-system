import { IsoDateTime } from './iso-date';
import { Product } from './product';

// One purchase of a product, seen from the product's side.
export interface ProductBuyer {
  customerPurchaseId: number;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  purchasedAt: IsoDateTime;
}

export interface ProductDetails {
  product: Product;
  // Newest first. Only customers that still exist appear (deleting a customer deletes their
  // purchase rows), so this can hold fewer entries than product.soldQuantity.
  buyers: ProductBuyer[];
}

import { IsoDateTime } from './iso-date';
import { Product } from './product';

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
  buyers: ProductBuyer[];
}

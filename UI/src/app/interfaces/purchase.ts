import { IsoDateTime } from './iso-date';

export interface Purchase {
  customerPurchaseId: number;
  customerId: string;
  productId: string;
  productName: string;
  category: string;
  // The product's current price, not a snapshot of what was paid at purchase time.
  price: number;
  purchasedAt: IsoDateTime;
}

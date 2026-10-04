import { IsoDateTime } from './iso-date';

export interface Purchase {
  customerPurchaseId: number;
  customerId: string;
  productId: string;
  productName: string;
  category: string;
  price: number;
  purchasedAt: IsoDateTime;
}

export interface Purchase {
  purchaseId: number;
  customerGuid: string;
  productGuid: string;
  productName: string;
  category: string;
  // The product's current price, not a snapshot of what was paid at purchase time.
  price: number;
  purchaseDate: string;
}

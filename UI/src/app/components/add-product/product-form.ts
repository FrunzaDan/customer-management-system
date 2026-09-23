import { pattern, required, schema } from '@angular/forms/signals';
import { CreateProductRequest } from '../../interfaces/product';

export interface ProductFormModel {
  name: string;
  category: string;
  comment: string;
  price: string; // <input type="number"> emits strings; the API wants a decimal (see toProduct)
  inventoryQuantity: string;
  depot: string;
}

export const emptyProductForm = (): ProductFormModel => ({
  name: '',
  category: '',
  comment: '',
  price: '',
  inventoryQuantity: '',
  depot: '',
});

// A strictly positive number, at most two decimal places — matches
// Product's CK_Product_Price / DECIMAL(10,2) column.
const PricePattern = /^\d+(\.\d{1,2})?$/;
// A strictly positive whole number.
const QuantityPattern = /^[1-9]\d*$/;

export const productFormSchema = schema<ProductFormModel>((p) => {
  required(p.name, { message: 'Product name is required' });
  required(p.category, { message: 'Category is required' });
  required(p.price, { message: 'Price is required' });
  pattern(p.price, PricePattern, {
    message: 'Price must be a positive number with up to two decimals',
  });
  required(p.inventoryQuantity, { message: 'Inventory quantity is required' });
  pattern(p.inventoryQuantity, QuantityPattern, {
    message: 'Inventory quantity must be a positive whole number',
  });
  required(p.depot, { message: 'Depot is required' });
});

// Comment is optional, so it's sent as null rather than an empty string.
export function toProduct(model: ProductFormModel): CreateProductRequest {
  return {
    name: model.name,
    category: model.category,
    comment: model.comment.trim() === '' ? null : model.comment,
    price: Number(model.price),
    inventoryQuantity: Number(model.inventoryQuantity),
    depot: model.depot,
  };
}

export function isProductFormDirty(
  model: ProductFormModel,
  baseline: ProductFormModel,
): boolean {
  return (Object.keys(model) as (keyof ProductFormModel)[]).some(
    (key) => model[key] !== baseline[key],
  );
}

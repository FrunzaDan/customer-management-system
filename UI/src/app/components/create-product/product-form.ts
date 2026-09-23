import { pattern, required, schema } from '@angular/forms/signals';
import { CreateProductRequest } from '../../interfaces/product';

export interface ProductFormModel {
  name: string;
  category: string;
  description: string;
  price: string; // <input type="number"> emits strings; the API wants a decimal (see toProduct)
  initialQuantity: string;
  warehouse: string;
}

export const emptyProductForm = (): ProductFormModel => ({
  name: '',
  category: '',
  description: '',
  price: '',
  initialQuantity: '',
  warehouse: '',
});

// A strictly positive number, at most two decimal places — matches
// Product's CK_Product_Price / DECIMAL(12,2) column.
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
  required(p.initialQuantity, { message: 'Initial quantity is required' });
  pattern(p.initialQuantity, QuantityPattern, {
    message: 'Initial quantity must be a positive whole number',
  });
  required(p.warehouse, { message: 'Warehouse is required' });
});

// Description is optional, so it's sent as null rather than an empty string.
export function toProduct(model: ProductFormModel): CreateProductRequest {
  return {
    name: model.name,
    category: model.category,
    description: model.description.trim() === '' ? null : model.description,
    price: Number(model.price),
    initialQuantity: Number(model.initialQuantity),
    warehouse: model.warehouse,
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

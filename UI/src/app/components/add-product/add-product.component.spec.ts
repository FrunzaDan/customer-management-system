import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AddProductService } from '../../services/add-product.service';
import { ProductFormModel } from './product-form';
import { AddProductComponent } from './add-product.component';

describe('AddProductComponent', () => {
  let addProduct: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let component: AddProductComponent;

  const validModel: ProductFormModel = {
    name: 'Widget',
    category: 'Gadgets',
    comment: '',
    price: '9.99',
    inventoryQuantity: '10',
    depot: 'Cluj',
  };

  beforeEach(() => {
    addProduct = vi.fn().mockReturnValue(of({ status: 200, responseMessage: 'ok' }));
    navigate = vi.fn().mockResolvedValue(true);

    // The component resolves its dependencies (and builds its signal form) in
    // field initializers, so it needs an active injection context.
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate } },
        { provide: AddProductService, useValue: { addProduct } },
      ],
    });

    component = TestBed.runInInjectionContext(() => new AddProductComponent());
  });

  it('does not call the service and reports the errors when the form is invalid', async () => {
    await submit(component.productForm);

    expect(addProduct).not.toHaveBeenCalled();
    expect(component.invalidSummary()).toBe(
      'The form has 5 errors. Please correct the highlighted fields.',
    );
  });

  it('validates the price and inventory quantity formats', () => {
    component.model.set({ ...validModel, price: 'free', inventoryQuantity: '-1' });

    expect(component.productForm.price().errors()[0].message).toBe(
      'Price must be a positive number with up to two decimals',
    );
    expect(component.productForm.inventoryQuantity().errors()[0].message).toBe(
      'Inventory quantity must be a positive whole number',
    );
  });

  it('maps the form value into a Product (price/quantity as numbers, blank comment as null) and adds it', async () => {
    component.model.set(validModel);

    await submit(component.productForm);

    expect(addProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Widget',
        category: 'Gadgets',
        comment: null,
        price: 9.99,
        inventoryQuantity: 10,
        depot: 'Cluj',
      }),
    );
  });

  it('navigates to the products list on success', async () => {
    component.model.set(validModel);

    await submit(component.productForm);

    expect(navigate).toHaveBeenCalledWith(['/products']);
    expect(component.errorMessage()).toBeNull();
  });

  it('sets a friendly message and stops submitting on a network error (status 0)', async () => {
    addProduct.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.model.set(validModel);

    await submit(component.productForm);

    expect(component.productForm().submitting()).toBe(false);
    expect(component.errorMessage()).toBe(
      'Could not reach the server. It may be offline, or your browser does not trust its security certificate.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('surfaces the server-provided message on a non-zero error status', async () => {
    addProduct.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { responseMessage: 'Price must be greater than zero.' },
          }),
      ),
    );
    component.model.set(validModel);

    await submit(component.productForm);

    expect(component.errorMessage()).toBe('Price must be greater than zero.');
  });

  describe('unsaved changes', () => {
    it('has none on a fresh form', () => {
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('has some as soon as the user types anything', () => {
      component.model.update((m) => ({ ...m, name: 'Widget' }));

      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('clears them once the product is saved, before navigating away', async () => {
      let dirtyAtNavigation: boolean | undefined;
      navigate.mockImplementation(async () => {
        dirtyAtNavigation = component.hasUnsavedChanges();
        return true;
      });
      component.model.set(validModel);

      await submit(component.productForm);

      expect(dirtyAtNavigation).toBe(false);
    });

    it('asks the browser to confirm closing/reloading the tab only when dirty', () => {
      const clean = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
      component.onBeforeUnload(clean);
      expect(clean.defaultPrevented).toBe(false);

      component.model.update((m) => ({ ...m, name: 'Widget' }));
      const dirty = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
      component.onBeforeUnload(dirty);
      expect(dirty.defaultPrevented).toBe(true);
    });
  });
});

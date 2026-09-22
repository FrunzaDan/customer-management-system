import { inject } from '@angular/core';
import { CanActivateFn, Routes } from '@angular/router';
import { AuthGuardService } from './services/auth-guard.service';
import { unsavedChangesGuard } from './services/unsaved-changes.guard';

const authGuardFn: CanActivateFn = () => {
  const authService = inject(AuthGuardService);
  return authService.canActivate();
};

// Every page is lazy-loaded so the initial bundle only carries the shell;
// `title` feeds AppTitleStrategy (document title = WCAG 2.4.2).
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/user-login/user-login.component').then(
        (m) => m.UserLoginComponent,
      ),
    title: 'Sign in',
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./components/home/home.component').then((m) => m.HomeComponent),
    canActivate: [authGuardFn],
    title: 'Customers',
  },
  {
    path: 'customers',
    loadComponent: () =>
      import('./components/home/home.component').then((m) => m.HomeComponent),
    canActivate: [authGuardFn],
    title: 'Customers',
  },
  {
    path: 'addCustomer',
    loadComponent: () =>
      import('./components/add-customer/add-customer.component').then(
        (m) => m.AddCustomerComponent,
      ),
    canActivate: [authGuardFn],
    canDeactivate: [unsavedChangesGuard],
    title: 'Register customer',
  },
  {
    path: 'editCustomer',
    loadComponent: () =>
      import('./components/edit-customer/edit-customer.component').then(
        (m) => m.EditCustomerComponent,
      ),
    canActivate: [authGuardFn],
    canDeactivate: [unsavedChangesGuard],
    title: 'Edit customer',
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./components/about/about.component').then(
        (m) => m.AboutComponent,
      ),
    canActivate: [authGuardFn],
    title: 'About',
  },
  {
    path: 'customerDetails',
    loadComponent: () =>
      import('./components/customer-details/customer-details.component').then(
        (m) => m.CustomerDetailsComponent,
      ),
    canActivate: [authGuardFn],
    title: 'Customer details',
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./components/products/products.component').then(
        (m) => m.ProductsComponent,
      ),
    canActivate: [authGuardFn],
    title: 'Products',
  },
  {
    path: 'addProduct',
    loadComponent: () =>
      import('./components/add-product/add-product.component').then(
        (m) => m.AddProductComponent,
      ),
    canActivate: [authGuardFn],
    canDeactivate: [unsavedChangesGuard],
    title: 'Add product',
  },
  {
    path: 'productDetails',
    loadComponent: () =>
      import('./components/product-details/product-details.component').then(
        (m) => m.ProductDetailsComponent,
      ),
    canActivate: [authGuardFn],
    title: 'Product details',
  },
  {
    path: 'auditLog',
    loadComponent: () =>
      import('./components/global-audit-log/global-audit-log.component').then(
        (m) => m.GlobalAuditLogComponent,
      ),
    canActivate: [authGuardFn],
    title: 'Audit log',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./components/page-not-found/page-not-found.component').then(
        (m) => m.PageNotFoundComponent,
      ),
    title: 'Page not found',
  },
];

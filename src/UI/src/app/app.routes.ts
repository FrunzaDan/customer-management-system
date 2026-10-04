import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';
import { unsavedChangesGuard } from './services/unsaved-changes.guard';

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
    redirectTo: 'customers',
    pathMatch: 'full',
  },
  {
    path: 'customers',
    loadComponent: () =>
      import('./components/home/home.component').then((m) => m.HomeComponent),
    canActivate: [authGuard],
    title: 'Customers',
  },
  {
    path: 'create-customer',
    loadComponent: () =>
      import('./components/create-customer/create-customer.component').then(
        (m) => m.CreateCustomerComponent,
      ),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    title: 'Add customer',
  },
  {
    path: 'customers/update/:customerId',
    loadComponent: () =>
      import('./components/update-customer/update-customer.component').then(
        (m) => m.UpdateCustomerComponent,
      ),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    title: 'Edit customer',
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./components/about/about.component').then(
        (m) => m.AboutComponent,
      ),
    canActivate: [authGuard],
    title: 'About',
  },
  {
    path: 'customers/:customerId',
    loadComponent: () =>
      import('./components/customer-details/customer-details.component').then(
        (m) => m.CustomerDetailsComponent,
      ),
    canActivate: [authGuard],
    title: 'Customer details',
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./components/products/products.component').then(
        (m) => m.ProductsComponent,
      ),
    canActivate: [authGuard],
    title: 'Products',
  },
  {
    path: 'create-product',
    loadComponent: () =>
      import('./components/create-product/create-product.component').then(
        (m) => m.CreateProductComponent,
      ),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
    title: 'Add product',
  },
  {
    path: 'products/:productId',
    loadComponent: () =>
      import('./components/product-details/product-details.component').then(
        (m) => m.ProductDetailsComponent,
      ),
    canActivate: [authGuard],
    title: 'Product details',
  },
  {
    path: 'charts',
    loadComponent: () =>
      import('./components/charts/charts.component').then(
        (m) => m.ChartsComponent,
      ),
    canActivate: [authGuard],
    title: 'Charts',
  },
  {
    path: 'audit-log',
    loadComponent: () =>
      import('./components/global-audit-log/global-audit-log.component').then(
        (m) => m.GlobalAuditLogComponent,
      ),
    canActivate: [authGuard],
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

import { Routes } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';

import { UserLoginComponent } from './components/user-login/user-login.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { HomeComponent } from './components/home/home.component';
import { AboutComponent } from './components/about/about.component';
import { AddCustomerComponent } from './components/add-customer/add-customer.component';
import { EditCustomerComponent } from './components/edit-customer/edit-customer.component';
import { CustomerDetailsComponent } from './components/customer-details/customer-details.component';
import { GlobalAuditLogComponent } from './components/global-audit-log/global-audit-log.component';
import { AuthGuardService } from './services/auth-guard.service';

const authGuardFn: CanActivateFn = () => {
  const authService = inject(AuthGuardService);
  return authService.canActivate();
};

export const routes: Routes = [
  {
    path: 'login',
    component: UserLoginComponent,
    title: 'Login',
  },
  {
    path: '',
    component: HomeComponent,
    canActivate: [authGuardFn],
    title: 'Customers',
  },
  {
    path: 'customers',
    component: HomeComponent,
    canActivate: [authGuardFn],
    title: 'Customers',
  },
  {
    path: 'addCustomer',
    component: AddCustomerComponent,
    canActivate: [authGuardFn],
    title: 'Add Customer',
  },
  {
    path: 'editCustomer',
    component: EditCustomerComponent,
    canActivate: [authGuardFn],
    title: 'Edit Customer',
  },
  {
    path: 'about',
    component: AboutComponent,
    canActivate: [authGuardFn],
    title: 'About',
  },
  {
    path: 'customerDetails',
    component: CustomerDetailsComponent,
    canActivate: [authGuardFn],
    title: 'Customer Details',
  },
  {
    path: 'auditLog',
    component: GlobalAuditLogComponent,
    canActivate: [authGuardFn],
    title: 'Audit Log',
  },
  {
    path: '**',
    component: PageNotFoundComponent,
  },
];

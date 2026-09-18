import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../../../src/app/interfaces/generic-response';
import { Customer } from '../interfaces/customer-response';
import { HttpHeaderService } from './http-header-service';
import { GetCustomerService } from './get-customer.service'; // Inject to update locally
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class EditCustomerService {
  private readonly APIURL =
    environment.CustomerManagementSystemAPI + '/api/Customer/edit';

  constructor(
    private http: HttpClient,
    private httpHeaderService: HttpHeaderService,
    private getCustomerService: GetCustomerService, // Used for local updates
    private notificationService: NotificationService,
  ) {}

  editCustomer(customer: Customer): Observable<GenericResponse<object>> {
    const headers: HttpHeaders =
      this.httpHeaderService.getHeadersWithTokenSet();

    return this.http
      .patch<GenericResponse<object>>(this.APIURL, customer, { headers })
      .pipe(
        tap(() => {
          this.getCustomerService.updateCustomerLocally(customer);
          this.notificationService.show('Customer updated successfully.');
        }),
      );
  }
}

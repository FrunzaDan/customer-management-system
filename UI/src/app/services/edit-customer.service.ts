import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../../../src/app/interfaces/generic-response';
import {
  Customer,
  UpdateCustomerRequest,
} from '../interfaces/customer-response';
import { HttpHeaderService } from './http-header-service';
import { GetCustomerService } from './get-customer.service'; // Inject to update locally
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class EditCustomerService {
  private readonly APIURL =
    environment.CustomerManagementSystemAPI + '/api/Customer/edit';

  private readonly http = inject(HttpClient);
  private readonly httpHeaderService = inject(HttpHeaderService);
  private readonly getCustomerService = inject(GetCustomerService);
  private readonly notificationService = inject(NotificationService);

  // Takes the whole edited customer (to update the local list with once saved) but sends
  // only the editable fields — the server-owned ones (status, dates) aren't part of an edit.
  editCustomer(customer: Customer): Observable<GenericResponse<object>> {
    const headers: HttpHeaders =
      this.httpHeaderService.getHeadersWithTokenSet();

    return this.http
      .patch<GenericResponse<object>>(
        this.APIURL,
        toUpdateCustomerRequest(customer),
        { headers },
      )
      .pipe(
        tap(() => {
          this.getCustomerService.updateCustomerLocally(customer);
          this.notificationService.show('Customer updated successfully.');
        }),
      );
  }
}

function toUpdateCustomerRequest(customer: Customer): UpdateCustomerRequest {
  return {
    guid: customer.guid,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    msisdn: customer.msisdn,
    gender: customer.gender,
    birthdate: customer.birthdate,
    address: customer.address,
  };
}

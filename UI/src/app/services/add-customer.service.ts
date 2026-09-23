import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CreateCustomerRequest } from '../interfaces/customer-response';
import { GenericResponse } from '../../../src/app/interfaces/generic-response';
import { environment } from '../../environments/environment';
import { HttpHeaderService } from './http-header-service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class AddCustomerService {
  private readonly httpHeaderService = inject(HttpHeaderService);
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  readonly APIURL =
    environment.apiUrl + '/api/customer/register';

  // On success, `data` is the new customer's server-generated GUID.
  addCustomer(customer: CreateCustomerRequest): Observable<GenericResponse<string>> {
    return this.addCustomerSilently(customer).pipe(
      tap(() => this.notificationService.show('Customer registered successfully.')),
    );
  }

  /**
   * Same endpoint as {@link addCustomer}, without the per-call success toast —
   * for callers (e.g. bulk test-data generation) that show one summary
   * notification instead of one per request.
   */
  addCustomerSilently(
    customer: CreateCustomerRequest,
  ): Observable<GenericResponse<string>> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    return this.http.post<GenericResponse<string>>(this.APIURL, customer, {
      headers: headers,
    });
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CreateCustomerRequest } from '../interfaces/customer-response';
import { GenericResponse } from '../../../src/app/interfaces/generic-response';
import { environment } from '../../environments/environment';
import { HttpHeaderService } from './http-header.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class CreateCustomerService {
  private readonly httpHeaderService = inject(HttpHeaderService);
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  readonly APIURL =
    environment.apiUrl + '/api/customer/create';

  // On success, `data` is the new customer's server-generated GUID.
  createCustomer(customer: CreateCustomerRequest): Observable<GenericResponse<string>> {
    return this.createCustomerSilently(customer).pipe(
      tap(() => this.notificationService.show('Customer registered successfully.')),
    );
  }

  /**
   * Same endpoint as {@link createCustomer}, without the per-call success toast —
   * for callers (e.g. bulk test-data generation) that show one summary
   * notification instead of one per request.
   */
  createCustomerSilently(
    customer: CreateCustomerRequest,
  ): Observable<GenericResponse<string>> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    return this.http.post<GenericResponse<string>>(this.APIURL, customer, {
      headers: headers,
    });
  }
}

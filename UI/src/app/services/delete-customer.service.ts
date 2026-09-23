import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../interfaces/generic-response';
import { GetCustomerService } from './get-customer.service';
import { HttpHeaderService } from './http-header-service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class DeleteCustomerService {
  readonly APIURL =
    environment.apiUrl + '/api/customer/delete';

  private readonly http = inject(HttpClient);
  private readonly httpHeaderService = inject(HttpHeaderService);
  private readonly getCustomerService = inject(GetCustomerService);
  private readonly notificationService = inject(NotificationService);

  deleteCustomer(customerId: string): Observable<GenericResponse<object>> {
    return this.deleteCustomerSilently(customerId).pipe(
      tap(() => this.notificationService.show('Customer deleted successfully.')),
    );
  }

  /**
   * Same endpoint as {@link deleteCustomer}, without the per-call success toast —
   * for bulk-delete callers that show one summary notification instead of one per
   * customer.
   */
  deleteCustomerSilently(
    customerId: string,
  ): Observable<GenericResponse<object>> {
    const headers: HttpHeaders =
      this.httpHeaderService.getHeadersWithTokenSet();
    const params = new HttpParams().set('customerId', customerId);

    return this.http
      .delete<GenericResponse<object>>(this.APIURL, { headers, params })
      .pipe(tap(() => this.getCustomerService.removeCustomerLocally(customerId)));
  }
}

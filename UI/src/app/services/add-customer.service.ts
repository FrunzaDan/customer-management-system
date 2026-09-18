import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Customer } from '../interfaces/customer-response';
import { GenericResponse } from '../../../src/app/interfaces/generic-response';
import { environment } from '../../environments/environment';
import { HttpHeaderService } from './http-header-service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class AddCustomerService {
  constructor(
    private httpHeaderService: HttpHeaderService,
    private http: HttpClient,
    private notificationService: NotificationService,
  ) {}
  readonly APIURL =
    environment.CustomerManagementSystemAPI + '/api/Customer/register';

  addCustomer(customer: Customer): Observable<GenericResponse<object>> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    return this.http
      .post<GenericResponse<object>>(this.APIURL, customer, {
        headers: headers,
      })
      .pipe(
        tap(() =>
          this.notificationService.show('Customer registered successfully.'),
        ),
      );
  }

  /**
   * Same endpoint as {@link addCustomer}, without the per-call success toast —
   * for callers (e.g. bulk test-data generation) that show one summary
   * notification instead of one per request.
   */
  addCustomerSilently(customer: Customer): Observable<GenericResponse<object>> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    return this.http.post<GenericResponse<object>>(this.APIURL, customer, {
      headers: headers,
    });
  }
}

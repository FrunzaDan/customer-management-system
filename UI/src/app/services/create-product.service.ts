import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CreateProductRequest } from '../interfaces/product';
import { GenericResponse } from '../interfaces/generic-response';
import { environment } from '../../environments/environment';
import { HttpHeaderService } from './http-header.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root',
})
export class CreateProductService {
  private readonly httpHeaderService = inject(HttpHeaderService);
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);
  readonly APIURL = environment.apiUrl + '/api/customer/product';

  // On success, `data` is the new product's server-generated GUID.
  createProduct(product: CreateProductRequest): Observable<GenericResponse<string>> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    return this.http
      .post<GenericResponse<string>>(this.APIURL, product, { headers })
      .pipe(tap(() => this.notificationService.show('Product added successfully.')));
  }
}

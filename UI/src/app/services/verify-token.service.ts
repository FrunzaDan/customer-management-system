import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GenericResponse } from '../../../src/app/interfaces/generic-response';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../src/environments/environment';
import { HttpHeaderService } from './http-header-service';

@Injectable({
  providedIn: 'root',
})
export class VerifyTokenService {
  readonly APIURL =
    environment.CustomerManagementSystemAPI +
    '/api/Authentication/verify-token';

  constructor(
    private http: HttpClient,
    private httpHeaderService: HttpHeaderService,
  ) {}

  isTokenValid(): Observable<boolean> {
    // Reaching a response at all means the API's [Authorize] middleware accepted the
    // token; any error (401 with an empty body, network failure, etc.) means it didn't.
    return this.verifyTokenViaAPI().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  verifyTokenViaAPI(): Observable<GenericResponse<object>> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();

    return this.http.get<GenericResponse<object>>(this.APIURL, {
      headers: headers,
    });
  }
}

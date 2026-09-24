import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GenericResponse } from '../interfaces/generic-response';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VerifyTokenService {
  private readonly apiUrl = `${environment.apiUrl}/api/authentication/verify-token`;

  private readonly http = inject(HttpClient);

  isTokenValid(): Observable<boolean> {
    // Reaching a response at all means the API's [Authorize] middleware accepted the
    // token; any error (401 with an empty body, network failure, etc.) means it didn't.
    return this.verifyTokenViaAPI().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  verifyTokenViaAPI(): Observable<GenericResponse<object>> {
    return this.http.get<GenericResponse<object>>(this.apiUrl);
  }
}

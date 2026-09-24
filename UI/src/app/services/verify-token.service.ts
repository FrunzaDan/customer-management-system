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
    return this.verifyTokenViaAPI().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  verifyTokenViaAPI(): Observable<GenericResponse<object>> {
    return this.http.get<GenericResponse<object>>(this.apiUrl);
  }
}

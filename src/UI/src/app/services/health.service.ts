import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap, timer } from 'rxjs';
import { environment } from '../../environments/environment';

const POLL_INTERVAL_MS = 15000;

@Injectable({
  providedIn: 'root',
})
export class HealthService {
  private readonly healthUrl = `${environment.apiUrl}/health`;

  private readonly http = inject(HttpClient);

  checkApiHealth(): Observable<boolean> {
    return this.http
      .get(this.healthUrl, { observe: 'response', responseType: 'text' })
      .pipe(
        map((response: HttpResponse<string>) => response.ok),
        catchError(() => of(false)),
      );
  }

  pollApiHealth(): Observable<boolean> {
    return timer(0, POLL_INTERVAL_MS).pipe(
      switchMap(() => this.checkApiHealth()),
    );
  }
}

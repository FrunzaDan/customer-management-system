import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
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
    // ASP.NET Core health checks answer with plain text ("Healthy"), not JSON.
    return this.http.get(this.healthUrl, { observe: 'response', responseType: 'text' }).pipe(
      map((response: HttpResponse<string>) => response.ok), // cleaner than status check
      catchError((error) => {
        this.logHealthError(error);
        return of(false);
      }),
    );
  }

  pollApiHealth(): Observable<boolean> {
    return timer(0, POLL_INTERVAL_MS).pipe(
      switchMap(() => this.checkApiHealth()),
    );
  }

  private logHealthError(error: unknown) {
    const name = error instanceof Error ? error.name : 'Unknown';
    const message = error instanceof Error ? error.message : 'No message';
    const status =
      error instanceof HttpErrorResponse ? ` | Status: ${error.status}` : '';
    console.error(
      `API health check failed! | URL: ${this.healthUrl} | Error: ${name} | Message: ${message}${status}`,
    );
  }
}

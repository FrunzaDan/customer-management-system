import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap, timer } from 'rxjs';
import { environment } from '../../environments/environment';

const POLL_INTERVAL_MS = 15000;

@Injectable({
  providedIn: 'root',
})
export class HealthService {
  private readonly healthUrl = `${environment.apiUrl}/health`;

  private readonly http = inject(HttpClient);

  /**
   * Checks if the API is reachable and responding.
   * @returns Observable<boolean> - true if API is healthy, false otherwise
   */
  checkApiHealth(): Observable<boolean> {
    return this.http.get<void>(this.healthUrl, { observe: 'response' }).pipe(
      map((response: HttpResponse<void>) => response.ok), // cleaner than status check
      catchError((error) => {
        this.logHealthError(error);
        return of(false);
      }),
    );
  }

  /**
   * Re-checks API health every POLL_INTERVAL_MS (starting immediately), so a
   * status shown in the UI reflects the API coming up or going down after the
   * initial load, not just its state at app startup.
   */
  pollApiHealth(): Observable<boolean> {
    return timer(0, POLL_INTERVAL_MS).pipe(
      switchMap(() => this.checkApiHealth()),
    );
  }

  /** Logs health check errors in a consistent format */
  private logHealthError(error: unknown) {
    const name = error instanceof Error ? error.name : 'Unknown';
    const message = error instanceof Error ? error.message : 'No message';
    const status = error instanceof HttpErrorResponse ? ` | Status: ${error.status}` : '';
    console.error(
      `API health check failed! | URL: ${this.healthUrl} | Error: ${name} | Message: ${message}${status}`,
    );
  }
}

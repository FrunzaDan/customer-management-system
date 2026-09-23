import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, signal, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { extractErrorMessage } from '../utils/extract-error-message';
import { HttpHeaderService } from './http-header.service';

export interface ExportCustomersParams {
  searchTerm?: string;
  sortColumn?: 'name' | 'email' | 'phoneNumber';
  sortDirection?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root',
})
export class ExportCustomerService {
  private readonly API_URL_EXPORT = `${environment.apiUrl}/api/customer/export`;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly http = inject(HttpClient);
  private readonly httpHeaderService = inject(HttpHeaderService);

  // Exports whatever the customer list is currently searching/sorted by, not
  // just the current page (see CustomerGetting.GetCustomersForExportFunction) —
  // the filename is generated client-side rather than read off the response's
  // Content-Disposition header, since that header isn't exposed cross-origin
  // by the API's current CORS policy.
  exportCustomers(params: ExportCustomersParams): void {
    this.loading.set(true);
    this.error.set(null);

    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    let httpParams = new HttpParams()
      .set('sortColumn', params.sortColumn ?? 'name')
      .set('sortDirection', params.sortDirection ?? 'asc');

    if (params.searchTerm) {
      httpParams = httpParams.set('searchTerm', params.searchTerm);
    }

    this.http
      .get(this.API_URL_EXPORT, {
        headers,
        params: httpParams,
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          this.loading.set(false);
          this.triggerDownload(blob, this.buildFilename());
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
  }

  private buildFilename(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `customers_${timestamp}.csv`;
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // error.error is a Blob here (responseType: 'blob' applies to error bodies
  // too), not parsed JSON, so a 4xx/5xx gets the generic "failed" message
  // rather than the server's specific one.
  private handleError(error: HttpErrorResponse): void {
    this.loading.set(false);
    this.error.set(extractErrorMessage(error, 'Failed to export customers'));
  }
}

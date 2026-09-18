import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpHeaderService } from './http-header-service';

export interface ExportCustomersParams {
  searchTerm?: string;
  sortColumn?: 'name' | 'email' | 'msisdn';
  sortDirection?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root',
})
export class ExportCustomerService {
  private readonly API_URL_EXPORT = `${environment.CustomerManagementSystemAPI}/api/Customer/export`;

  readonly loadingSignal = signal(false);
  readonly errorSignal = signal<string | null>(null);

  constructor(
    private http: HttpClient,
    private httpHeaderService: HttpHeaderService,
  ) {}

  // Exports whatever the customer list is currently searching/sorted by, not
  // just the current page (see CustomerGetting.GetCustomersForExportFunction) —
  // the filename is generated client-side rather than read off the response's
  // Content-Disposition header, since that header isn't exposed cross-origin
  // by the API's current CORS policy.
  exportCustomers(params: ExportCustomersParams): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

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
          this.loadingSignal.set(false);
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

  private handleError(error: HttpErrorResponse): void {
    let errorMessage = 'An unknown error occurred';

    // error.error is a Blob here (responseType: 'blob' applies to error bodies
    // too), not parsed JSON, so a 4xx/5xx falls through to the generic message
    // below rather than the server's specific one.
    if (error.status === 0) {
      errorMessage = 'Network error - please check your connection.';
    } else if (error.status >= 400 && error.status < 500) {
      errorMessage = error.error?.message || 'Client-side error occurred.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error - please try again later.';
    }

    console.error('ExportCustomerService Error:', errorMessage);
    this.loadingSignal.set(false);
    this.errorSignal.set(errorMessage);
  }
}

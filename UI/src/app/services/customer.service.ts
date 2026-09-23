import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { computed, Injectable, signal, inject } from '@angular/core';
import {
  catchError,
  map,
  Observable,
  of,
  retry,
  Subject,
  switchMap,
  tap,
  throwError,
  timer,
} from 'rxjs';
import {
  CreateCustomerRequest,
  Customer,
  CustomerStatus,
  UpdateCustomerRequest,
} from '../interfaces/customer';
import { environment } from '../../environments/environment';
import { extractErrorMessage } from '../utils/extract-error-message';
import { GenericResponse } from '../interfaces/generic-response';
import { PagedResponse } from '../interfaces/paged-response';
import { HttpHeaderService } from './http-header.service';
import { NotificationService } from './notification.service';

export interface LoadCustomersParams {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  sortColumn?: 'name' | 'email' | 'phoneNumber';
  sortDirection?: 'asc' | 'desc';
}

export type ExportCustomersParams = Omit<
  LoadCustomersParams,
  'pageNumber' | 'pageSize'
>;

const DEFAULT_PAGE_SIZE = 10;

// Only retry transient failures (no response reached the browser, or a 5xx from the
// server) — a definitive 4xx (expired session, already-deactivated, unknown GUID) will
// never succeed on retry, so retrying it just re-triggers side effects (e.g. the 401
// interceptor's logout/redirect) 3 extra times for nothing. Backed off, not immediate.
const TRANSIENT_ERROR_RETRY_CONFIG = {
  count: 3,
  delay: (error: unknown, retryCount: number) =>
    error instanceof HttpErrorResponse &&
    (error.status === 0 || error.status >= 500)
      ? timer(retryCount * 500)
      : throwError(() => error),
};

// Every /api/customer call, in one service (like Imalo's ScholarService). It also holds
// the loaded page of customers and the selected customer, and keeps them in step with
// each successful update, status change and delete.
@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly API_URL = `${environment.apiUrl}/api/customer`;

  private readonly http = inject(HttpClient);
  private readonly httpHeaderService = inject(HttpHeaderService);
  private readonly notificationService = inject(NotificationService);

  private readonly state = signal({
    customers: [] as Customer[],
    selectedCustomer: null as Customer | null,
    loading: false,
    error: null as string | null,
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: 0,
  });

  readonly customers = computed(() => this.state().customers);
  readonly selectedCustomer = computed(() => this.state().selectedCustomer);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly pageNumber = computed(() => this.state().pageNumber);
  readonly pageSize = computed(() => this.state().pageSize);
  readonly totalItems = computed(() => this.state().totalItems);

  // Deactivate/reactivate have their own in-flight/error state, separate from the list's.
  private readonly activationState = signal({
    loading: false,
    error: null as string | null,
  });

  readonly activationLoading = computed(() => this.activationState().loading);
  readonly activationError = computed(() => this.activationState().error);

  readonly exportLoading = signal(false);
  readonly exportError = signal<string | null>(null);

  // Routed through switchMap so a new loadCustomers() call cancels whatever request is
  // still in flight — without this, a slower earlier response (e.g. a stale page/search)
  // can land after a faster later one and overwrite it with stale data.
  private readonly loadCustomersParams$ = new Subject<LoadCustomersParams>();

  constructor() {
    this.loadCustomersParams$
      .pipe(
        switchMap((params) => {
          const headers = this.httpHeaderService.getHeadersWithTokenSet();
          let httpParams = new HttpParams()
            .set('pageNumber', params.pageNumber)
            .set('pageSize', params.pageSize)
            .set('sortColumn', params.sortColumn ?? 'name')
            .set('sortDirection', params.sortDirection ?? 'asc');

          if (params.searchTerm) {
            httpParams = httpParams.set('searchTerm', params.searchTerm);
          }

          return this.http
            .get<GenericResponse<PagedResponse<Customer>>>(
              `${this.API_URL}/all`,
              { headers, params: httpParams },
            )
            .pipe(
              map((response) => ({ response, requestedParams: params })),
              catchError((error: HttpErrorResponse) => {
                this.handleError(error);
                return of(null);
              }),
            );
        }),
      )
      .subscribe((result) => {
        if (!result || !result.response) return;

        const { response, requestedParams } = result;
        const paged = response.data;
        this.state.update((state) => ({
          ...state,
          customers: paged?.items ?? [],
          pageNumber: paged?.pageNumber ?? requestedParams.pageNumber,
          pageSize: paged?.pageSize ?? requestedParams.pageSize,
          totalItems: paged?.totalItems ?? 0,
          loading: false,
          error: null,
        }));
      });
  }

  // Pagination, search, and sorting are all server-side: each call re-fetches
  // just the requested page from the API rather than filtering/sorting an
  // already-loaded full list in memory.
  loadCustomers(params: LoadCustomersParams): void {
    this.setLoading(true);
    this.loadCustomersParams$.next(params);
  }

  getCustomer(customerId: string): void {
    this.setLoading(true);

    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    const params = new HttpParams().set('searchTerm', customerId);

    this.http
      .get<GenericResponse<Customer>>(`${this.API_URL}/get`, {
        headers,
        params,
      })
      .subscribe({
        next: (response) => {
          this.state.update((state) => ({
            ...state,
            selectedCustomer: response?.data ?? null,
            loading: false,
            error: null,
          }));
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
  }

  // On success, `data` is the new customer's server-generated GUID.
  createCustomer(
    customer: CreateCustomerRequest,
  ): Observable<GenericResponse<string>> {
    return this.createCustomerSilently(customer).pipe(
      tap(() =>
        this.notificationService.show('Customer registered successfully.'),
      ),
    );
  }

  /**
   * Same endpoint as {@link createCustomer}, without the per-call success toast —
   * for callers (e.g. bulk test-data generation) that show one summary
   * notification instead of one per request.
   */
  createCustomerSilently(
    customer: CreateCustomerRequest,
  ): Observable<GenericResponse<string>> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    return this.http.post<GenericResponse<string>>(
      `${this.API_URL}/create`,
      customer,
      { headers },
    );
  }

  // Takes the whole edited customer (to update the local list with once saved) but sends
  // only the editable fields — the server-owned ones (status, dates) aren't part of an edit.
  updateCustomer(customer: Customer): Observable<GenericResponse<object>> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();

    return this.http
      .patch<GenericResponse<object>>(
        `${this.API_URL}/update`,
        toUpdateCustomerRequest(customer),
        { headers },
      )
      .pipe(
        tap(() => {
          this.updateCustomerLocally(customer);
          this.notificationService.show('Customer updated successfully.');
        }),
      );
  }

  deleteCustomer(customerId: string): Observable<GenericResponse<object>> {
    return this.deleteCustomerSilently(customerId).pipe(
      tap(() =>
        this.notificationService.show('Customer deleted successfully.'),
      ),
    );
  }

  /**
   * Same endpoint as {@link deleteCustomer}, without the per-call success toast —
   * for bulk-delete callers that show one summary notification instead of one per
   * customer.
   */
  deleteCustomerSilently(
    customerId: string,
  ): Observable<GenericResponse<object>> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    const params = new HttpParams().set('customerId', customerId);

    return this.http
      .delete<GenericResponse<object>>(`${this.API_URL}/delete`, {
        headers,
        params,
      })
      .pipe(tap(() => this.removeCustomerLocally(customerId)));
  }

  deactivateCustomer(customerId: string): void {
    this.changeStatus(customerId, 'deactivate', CustomerStatus.Deactivated);
  }

  reactivateCustomer(customerId: string): void {
    this.changeStatus(customerId, 'reactivate', CustomerStatus.Active);
  }

  /**
   * Same endpoint as {@link deactivateCustomer}, without the shared loading/error
   * signal or the per-call success toast — for bulk-action callers that show one
   * summary notification and track their own in-flight state instead.
   */
  deactivateCustomerSilently(
    customerId: string,
  ): Observable<GenericResponse<object>> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    const params = new HttpParams().set('customerId', customerId);

    return this.http
      .patch<GenericResponse<object>>(`${this.API_URL}/deactivate`, null, {
        headers,
        params,
      })
      .pipe(
        tap(() =>
          this.setStatusLocally(customerId, CustomerStatus.Deactivated),
        ),
      );
  }

  // Exports whatever the customer list is currently searching/sorted by, not
  // just the current page (see CustomerGetting.GetCustomersForExportFunction) —
  // the filename is generated client-side rather than read off the response's
  // Content-Disposition header, since that header isn't exposed cross-origin
  // by the API's current CORS policy.
  exportCustomers(params: ExportCustomersParams): void {
    this.exportLoading.set(true);
    this.exportError.set(null);

    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    let httpParams = new HttpParams()
      .set('sortColumn', params.sortColumn ?? 'name')
      .set('sortDirection', params.sortDirection ?? 'asc');

    if (params.searchTerm) {
      httpParams = httpParams.set('searchTerm', params.searchTerm);
    }

    this.http
      .get(`${this.API_URL}/export`, {
        headers,
        params: httpParams,
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          this.exportLoading.set(false);
          this.triggerDownload(blob, this.buildExportFilename());
        },
        // error.error is a Blob here (responseType: 'blob' applies to error bodies
        // too), not parsed JSON, so a 4xx/5xx gets the generic "failed" message
        // rather than the server's specific one.
        error: (error: HttpErrorResponse) => {
          this.exportLoading.set(false);
          this.exportError.set(
            extractErrorMessage(error, 'Failed to export customers'),
          );
        },
      });
  }

  private changeStatus(
    customerId: string,
    action: 'deactivate' | 'reactivate',
    status: CustomerStatus,
  ): void {
    this.activationState.set({ loading: true, error: null });
    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    const params = new HttpParams().set('customerId', customerId);

    this.http
      .patch<GenericResponse<object>>(`${this.API_URL}/${action}`, null, {
        headers,
        params,
      })
      .pipe(retry(TRANSIENT_ERROR_RETRY_CONFIG))
      .subscribe({
        next: (response) => {
          if (response.status != 200) {
            this.handleActivationError(
              new Error(
                action === 'deactivate'
                  ? 'Deactivation failed'
                  : 'Reactivation failed',
              ),
            );
            return;
          }

          if (!this.setStatusLocally(customerId, status)) {
            this.handleActivationError(
              new Error(`Customer with GUID ${customerId} not found locally.`),
            );
            return;
          }

          this.activationState.set({ loading: false, error: null });
          this.notificationService.show(`Customer ${action}d successfully.`);
        },
        error: (error: HttpErrorResponse) => this.handleActivationError(error),
      });
  }

  // Returns false when the customer isn't in the loaded list.
  private setStatusLocally(
    customerId: string,
    status: CustomerStatus,
  ): boolean {
    const existingCustomer = this.customers().find(
      (c) => c.customerId === customerId,
    );
    if (!existingCustomer) return false;

    this.updateCustomerLocally({ ...existingCustomer, status });
    return true;
  }

  private updateCustomerLocally(updatedCustomer: Customer): void {
    this.state.update((state) => ({
      ...state,
      customers: state.customers.map((c) =>
        c.customerId === updatedCustomer.customerId ? updatedCustomer : c,
      ),
      selectedCustomer:
        state.selectedCustomer?.customerId === updatedCustomer.customerId
          ? updatedCustomer
          : state.selectedCustomer,
    }));
  }

  private removeCustomerLocally(customerId: string): void {
    this.state.update((state) => ({
      ...state,
      customers: state.customers.filter((c) => c.customerId !== customerId),
      selectedCustomer:
        state.selectedCustomer?.customerId === customerId
          ? null
          : state.selectedCustomer,
    }));
  }

  private buildExportFilename(): string {
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

  private setLoading(loading: boolean): void {
    this.state.update((state) => ({
      ...state,
      loading,
      error: loading ? state.error : null, // Clear error only if loading is false
    }));
  }

  private handleError(error: HttpErrorResponse): void {
    this.state.update((state) => ({
      ...state,
      loading: false,
      error: extractErrorMessage(error, 'Failed to load customers'),
    }));
  }

  // An Error (not an HttpErrorResponse) is a request that succeeded at the HTTP
  // level but that the API reported as not done; its message is already user-facing.
  private handleActivationError(error: HttpErrorResponse | Error): void {
    this.activationState.set({
      loading: false,
      error:
        error instanceof HttpErrorResponse
          ? extractErrorMessage(error, 'Failed to update the customer status')
          : error.message,
    });
  }
}

function toUpdateCustomerRequest(customer: Customer): UpdateCustomerRequest {
  return {
    customerId: customer.customerId,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phoneNumber: customer.phoneNumber,
    gender: customer.gender,
    birthDate: customer.birthDate ?? undefined,
    address: customer.address,
  };
}

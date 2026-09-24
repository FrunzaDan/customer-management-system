import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  httpResource,
} from '@angular/common/http';
import {
  computed,
  inject,
  Injectable,
  linkedSignal,
  signal,
} from '@angular/core';
import { Observable, map, retry, tap, throwError, timer } from 'rxjs';
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
// the loaded page of customers and keeps it in step with each successful update,
// status change and delete. A single customer is read with getCustomer(), which the details
// and edit pages key their own rxResource on.
@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly apiUrl = `${environment.apiUrl}/api/customer`;

  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  // The requested page, search and sort. No request is made until loadCustomers() is
  // first called (returning undefined idles the resource), and a new value cancels the
  // request still in flight, so a slower stale page can't overwrite a newer one.
  private readonly listParams = signal<LoadCustomersParams | undefined>(
    undefined,
  );

  // Pagination, search, and sorting are all server-side: each change re-fetches just the
  // requested page rather than filtering/sorting an already-loaded full list in memory.
  private readonly customersResource = httpResource<
    GenericResponse<PagedResponse<Customer>>
  >(() => {
    const params = this.listParams();
    if (!params) return undefined;
    return {
      url: `${this.apiUrl}/all`,
      params: {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        sortColumn: params.sortColumn ?? 'name',
        sortDirection: params.sortDirection ?? 'asc',
        ...(params.searchTerm ? { searchTerm: params.searchTerm } : {}),
      },
    };
  });

  // The last page that loaded. A resource drops its value when its params change, so
  // this keeps the current rows on screen while the next page, search or sort loads (and
  // after a failed load). hasValue() guards the read: value() throws while in error.
  private readonly page = linkedSignal<
    PagedResponse<Customer> | undefined,
    PagedResponse<Customer> | undefined
  >({
    source: () =>
      this.customersResource.hasValue()
        ? (this.customersResource.value().data ?? undefined)
        : undefined,
    computation: (page, previous) => page ?? previous?.value,
  });

  readonly customers = computed(() => this.page()?.items ?? []);
  readonly pageNumber = computed(
    () => this.page()?.pageNumber ?? this.listParams()?.pageNumber ?? 1,
  );
  readonly pageSize = computed(
    () =>
      this.page()?.pageSize ?? this.listParams()?.pageSize ?? DEFAULT_PAGE_SIZE,
  );
  readonly totalItems = computed(() => this.page()?.totalItems ?? 0);
  readonly loading = this.customersResource.isLoading;
  readonly error = computed(() => {
    const error = this.customersResource.error();
    return error
      ? extractErrorMessage(
          error as HttpErrorResponse,
          'Failed to load customers',
        )
      : null;
  });

  // Deactivate/reactivate have their own in-flight/error state, separate from the list's.
  private readonly activationState = signal({
    loading: false,
    error: null as string | null,
  });

  readonly activationLoading = computed(() => this.activationState().loading);
  readonly activationError = computed(() => this.activationState().error);

  readonly exportLoading = signal(false);
  readonly exportError = signal<string | null>(null);

  loadCustomers(params: LoadCustomersParams): void {
    // A new object always counts as a change, so the same page is fetched again too.
    this.listParams.set({ ...params });
  }

  // One customer by id, for the details and edit pages (each keys an rxResource on it).
  getCustomer(customerId: string): Observable<Customer> {
    return this.http
      .get<GenericResponse<Customer>>(`${this.apiUrl}/get`, {
        params: { searchTerm: customerId },
      })
      .pipe(
        map((response) => {
          if (!response.data) throw new Error('Customer not found.');
          return response.data;
        }),
      );
  }

  // On success, `data` is the new customer's server-generated GUID.
  createCustomer(
    customer: CreateCustomerRequest,
  ): Observable<GenericResponse<string>> {
    return this.createCustomerSilently(customer).pipe(
      tap(() => this.notificationService.show('Customer added successfully.')),
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
    return this.http.post<GenericResponse<string>>(
      `${this.apiUrl}/create`,
      customer,
    );
  }

  // Takes the whole edited customer (to update the local list with once saved) but sends
  // only the editable fields — the server-owned ones (status, dates) aren't part of an edit.
  updateCustomer(customer: Customer): Observable<GenericResponse<object>> {
    return this.http
      .patch<GenericResponse<object>>(
        `${this.apiUrl}/update`,
        toUpdateCustomerRequest(customer),
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
    const params = new HttpParams().set('customerId', customerId);

    return this.http
      .delete<GenericResponse<object>>(`${this.apiUrl}/delete`, { params })
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
    const params = new HttpParams().set('customerId', customerId);

    return this.http
      .patch<GenericResponse<object>>(`${this.apiUrl}/deactivate`, null, {
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

    let httpParams = new HttpParams()
      .set('sortColumn', params.sortColumn ?? 'name')
      .set('sortDirection', params.sortDirection ?? 'asc');

    if (params.searchTerm) {
      httpParams = httpParams.set('searchTerm', params.searchTerm);
    }

    this.http
      .get(`${this.apiUrl}/export`, {
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
    const params = new HttpParams().set('customerId', customerId);

    this.http
      .patch<GenericResponse<object>>(`${this.apiUrl}/${action}`, null, {
        params,
      })
      .pipe(retry(TRANSIENT_ERROR_RETRY_CONFIG))
      .subscribe({
        // A rejected change (e.g. 409 "already deactivated") arrives as an HTTP
        // error with a Problem Details body, so reaching next() means it was done.
        next: () => {
          this.setStatusLocally(customerId, status);
          this.activationState.set({ loading: false, error: null });
          this.notificationService.show(`Customer ${action}d successfully.`);
        },
        error: (error: HttpErrorResponse) => this.handleActivationError(error),
      });
  }

  // Shows the new status in the loaded list straight away. A details page
  // reloads its own copy once activationLoading() turns false.
  private setStatusLocally(customerId: string, status: CustomerStatus): void {
    const existingCustomer = this.customers().find(
      (c) => c.customerId === customerId,
    );
    if (existingCustomer)
      this.updateCustomerLocally({ ...existingCustomer, status });
  }

  // Edits the loaded list in place (no refetch), so it keeps in step with a
  // change the API just confirmed.
  private updateCustomerLocally(updatedCustomer: Customer): void {
    this.updateLoadedPage((items) =>
      items.map((c) =>
        c.customerId === updatedCustomer.customerId ? updatedCustomer : c,
      ),
    );
  }

  private removeCustomerLocally(customerId: string): void {
    this.updateLoadedPage((items) =>
      items.filter((c) => c.customerId !== customerId),
    );
  }

  private updateLoadedPage(update: (items: Customer[]) => Customer[]): void {
    this.page.update((page) => page && { ...page, items: update(page.items) });
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

  private handleActivationError(error: HttpErrorResponse): void {
    this.activationState.set({
      loading: false,
      error: extractErrorMessage(error, 'Failed to update the customer status'),
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

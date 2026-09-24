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

const TRANSIENT_ERROR_RETRY_CONFIG = {
  count: 3,
  delay: (error: unknown, retryCount: number) =>
    error instanceof HttpErrorResponse &&
    (error.status === 0 || error.status >= 500)
      ? timer(retryCount * 500)
      : throwError(() => error),
};

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly apiUrl = `${environment.apiUrl}/api/customer`;

  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  private readonly listParams = signal<LoadCustomersParams | undefined>(
    undefined,
  );

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

  private readonly activationState = signal({
    loading: false,
    error: null as string | null,
  });

  readonly activationLoading = computed(() => this.activationState().loading);
  readonly activationError = computed(() => this.activationState().error);

  readonly exportLoading = signal(false);
  readonly exportError = signal<string | null>(null);

  loadCustomers(params: LoadCustomersParams): void {
    this.listParams.set({ ...params });
  }

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

  createCustomer(
    customer: CreateCustomerRequest,
  ): Observable<GenericResponse<string>> {
    return this.createCustomerSilently(customer).pipe(
      tap(() => this.notificationService.show('Customer added successfully.')),
    );
  }

  createCustomerSilently(
    customer: CreateCustomerRequest,
  ): Observable<GenericResponse<string>> {
    return this.http.post<GenericResponse<string>>(
      `${this.apiUrl}/create`,
      customer,
    );
  }

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

  deleteCustomerSilently(
    customerId: string,
  ): Observable<GenericResponse<object>> {
    const params = new HttpParams().set('customerId', customerId);

    return this.http
      .delete<GenericResponse<object>>(`${this.apiUrl}/delete`, { params })
      .pipe(tap(() => this.removeCustomerLocally(customerId)));
  }

  deactivateCustomer(customerId: string): void {
    this.changeStatus(customerId, 'deactivate');
  }

  reactivateCustomer(customerId: string): void {
    this.changeStatus(customerId, 'reactivate');
  }

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
        error: (error: HttpErrorResponse) => {
          this.exportLoading.set(false);
          void this.setExportError(error);
        },
      });
  }

  private changeStatus(
    customerId: string,
    action: 'deactivate' | 'reactivate',
  ): void {
    this.activationState.set({ loading: true, error: null });
    const params = new HttpParams().set('customerId', customerId);

    this.http
      .patch<GenericResponse<object>>(`${this.apiUrl}/${action}`, null, {
        params,
      })
      .pipe(retry(TRANSIENT_ERROR_RETRY_CONFIG))
      .subscribe({
        next: () => {
          if (action === 'deactivate') {
            this.setStatusLocally(customerId, CustomerStatus.Deactivated);
          } else {
            this.refreshCustomerLocally(customerId);
          }
          this.activationState.set({ loading: false, error: null });
          this.notificationService.show(`Customer ${action}d successfully.`);
        },
        error: (error: HttpErrorResponse) => this.handleActivationError(error),
      });
  }

  private setStatusLocally(customerId: string, status: CustomerStatus): void {
    const existingCustomer = this.customers().find(
      (c) => c.customerId === customerId,
    );
    if (existingCustomer)
      this.updateCustomerLocally({ ...existingCustomer, status });
  }

  private refreshCustomerLocally(customerId: string): void {
    if (!this.customers().some((item) => item.customerId === customerId))
      return;
    this.getCustomer(customerId).subscribe({
      next: (customer) => this.updateCustomerLocally(customer),
      error: () => this.setStatusLocally(customerId, CustomerStatus.Active),
    });
  }

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

  private async setExportError(error: HttpErrorResponse): Promise<void> {
    const body =
      error.error instanceof Blob
        ? await readJsonBlob(error.error)
        : error.error;
    this.exportError.set(
      extractErrorMessage(
        new HttpErrorResponse({
          error: body,
          headers: error.headers,
          status: error.status,
          statusText: error.statusText,
          url: error.url ?? undefined,
        }),
        'Failed to export customers',
      ),
    );
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

async function readJsonBlob(blob: Blob): Promise<unknown> {
  try {
    return JSON.parse(await blob.text());
  } catch {
    return null;
  }
}

import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { computed, Injectable, Signal, signal, inject } from '@angular/core';
import { catchError, map, Observable, of, Subject, switchMap } from 'rxjs';
import { Customer } from '../interfaces/customer-response';
import { environment } from '../../environments/environment';
import { extractErrorMessage } from '../utils/extract-error-message';
import { GenericResponse } from '../interfaces/generic-response';
import { PagedResponse } from '../interfaces/paged-response';
import { HttpHeaderService } from './http-header.service';

export interface LoadCustomersParams {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  sortColumn?: 'name' | 'email' | 'phoneNumber';
  sortDirection?: 'asc' | 'desc';
}

const DEFAULT_PAGE_SIZE = 10;

@Injectable({
  providedIn: 'root',
})
export class GetCustomerService {
  private readonly API_URL_GET_ALL = `${environment.apiUrl}/api/customer/all`;
  private readonly API_URL_GET_SINGLE = `${environment.apiUrl}/api/customer/get`;

  private readonly state = signal({
    customers: [] as Customer[],
    selectedCustomer: null as Customer | null,
    loading: false,
    error: null as string | null,
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: 0,
  });

  // Computed signals
  readonly customers = computed(() => this.state().customers);
  readonly selectedCustomer = computed(
    () => this.state().selectedCustomer,
  );
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly pageNumber = computed(() => this.state().pageNumber);
  readonly pageSize = computed(() => this.state().pageSize);
  readonly totalItems = computed(() => this.state().totalItems);

  // Routed through switchMap so a new loadCustomers() call cancels whatever request is
  // still in flight — without this, a slower earlier response (e.g. a stale page/search)
  // can land after a faster later one and overwrite it with stale data.
  private readonly loadCustomersParams$ = new Subject<LoadCustomersParams>();

  private readonly http = inject(HttpClient);
  private readonly httpHeaderService = inject(HttpHeaderService);

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
              this.API_URL_GET_ALL,
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

  getCustomer(queryString: string): void {
    this.setLoading(true);

    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    const params = new HttpParams().set('searchTerm', queryString);

    this.http
      .get<GenericResponse<Customer>>(this.API_URL_GET_SINGLE, {
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

  updateCustomerLocally(updatedCustomer: Customer): void {
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

  removeCustomerLocally(customerId: string): void {
    this.state.update((state) => ({
      ...state,
      customers: state.customers.filter((c) => c.customerId !== customerId),
      selectedCustomer:
        state.selectedCustomer?.customerId === customerId
          ? null
          : state.selectedCustomer,
    }));
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
}

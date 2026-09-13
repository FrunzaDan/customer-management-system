import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { computed, Injectable, Signal, signal } from '@angular/core';
import { catchError, map, of, Subject, switchMap } from 'rxjs';
import { Customer } from '../interfaces/customer-response';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../interfaces/generic-response';
import { PagedResponse } from '../interfaces/paged-response';
import { HttpHeaderService } from './http-header-service';

export interface LoadCustomersParams {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  sortColumn?: 'name' | 'email' | 'msisdn';
  sortDirection?: 'asc' | 'desc';
}

const DEFAULT_PAGE_SIZE = 10;

@Injectable({
  providedIn: 'root',
})
export class GetCustomerService {
  private readonly API_URL_GET_ALL = `${environment.CustomerManagementSystemAPI}/api/Customer/all`;
  private readonly API_URL_GET_SINGLE = `${environment.CustomerManagementSystemAPI}/api/Customer/get`;

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
  public readonly customersSignal = computed(() => this.state().customers);
  public readonly selectedCustomerSignal = computed(
    () => this.state().selectedCustomer,
  );
  public readonly loadingSignal = computed(() => this.state().loading);
  public readonly errorSignal = computed(() => this.state().error);
  public readonly pageNumberSignal = computed(() => this.state().pageNumber);
  public readonly pageSizeSignal = computed(() => this.state().pageSize);
  public readonly totalItemsSignal = computed(() => this.state().totalItems);

  // Routed through switchMap so a new loadCustomers() call cancels whatever request is
  // still in flight — without this, a slower earlier response (e.g. a stale page/search)
  // can land after a faster later one and overwrite it with stale data.
  private readonly loadCustomersParams$ = new Subject<LoadCustomersParams>();

  constructor(
    private http: HttpClient,
    private httpHeaderService: HttpHeaderService,
  ) {
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
  public loadCustomers(params: LoadCustomersParams): void {
    this.setLoading(true);
    this.loadCustomersParams$.next(params);
  }

  getCustomer(queryString: string): void {
    this.setLoading(true);

    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    const params = new HttpParams().set('searchVariable', queryString);

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
        c.guid === updatedCustomer.guid ? updatedCustomer : c,
      ),
      selectedCustomer:
        state.selectedCustomer?.guid === updatedCustomer.guid
          ? updatedCustomer
          : state.selectedCustomer,
    }));
  }

  removeCustomerLocally(customerGUID: string): void {
    this.state.update((state) => ({
      ...state,
      customers: state.customers.filter((c) => c.guid !== customerGUID),
      selectedCustomer:
        state.selectedCustomer?.guid === customerGUID
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
    let errorMessage = 'An unknown error occurred';

    if (error.status === 0) {
      errorMessage = 'Network error - please check your connection.';
    } else if (error.status >= 400 && error.status < 500) {
      errorMessage = error.error?.message || 'Client-side error occurred.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error - please try again later.';
    }

    console.error('CustomerService Error:', errorMessage);
    this.state.update((state) => ({
      ...state,
      loading: false,
      error: errorMessage,
    }));
  }
}

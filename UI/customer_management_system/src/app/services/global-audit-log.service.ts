import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { GenericResponse } from '../interfaces/generic-response';
import { GlobalAuditLogEntry } from '../interfaces/global-audit-log-entry';
import { PagedResponse } from '../interfaces/paged-response';
import { HttpHeaderService } from './http-header-service';
import { NotificationService } from './notification.service';

export interface LoadAllAuditLogParams {
  pageNumber: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 10;

@Injectable({
  providedIn: 'root',
})
export class GlobalAuditLogService {
  private readonly API_URL = `${environment.CustomerManagementSystemAPI}/api/Customer/auditLog/all`;

  private readonly state = signal({
    entries: [] as GlobalAuditLogEntry[],
    loading: false,
    error: null as string | null,
    pageNumber: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: 0,
  });

  public readonly entriesSignal = computed(() => this.state().entries);
  public readonly loadingSignal = computed(() => this.state().loading);
  public readonly errorSignal = computed(() => this.state().error);
  public readonly pageNumberSignal = computed(() => this.state().pageNumber);
  public readonly totalItemsSignal = computed(() => this.state().totalItems);

  constructor(
    private http: HttpClient,
    private httpHeaderService: HttpHeaderService,
    private notificationService: NotificationService,
  ) {}

  loadAllAuditLog(params: LoadAllAuditLogParams): void {
    this.state.update((state) => ({ ...state, loading: true, error: null }));

    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    const httpParams = new HttpParams()
      .set('pageNumber', params.pageNumber)
      .set('pageSize', params.pageSize);

    this.http
      .get<GenericResponse<PagedResponse<GlobalAuditLogEntry>>>(
        this.API_URL,
        { headers, params: httpParams },
      )
      .subscribe({
        next: (response) => {
          const paged = response?.data;
          this.state.update((state) => ({
            ...state,
            entries: paged?.items ?? [],
            pageNumber: paged?.pageNumber ?? params.pageNumber,
            pageSize: paged?.pageSize ?? params.pageSize,
            totalItems: paged?.totalItems ?? 0,
            loading: false,
            error: null,
          }));
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
  }

  deleteAllAuditLog(): Observable<GenericResponse<object>> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();

    return this.http
      .delete<GenericResponse<object>>(this.API_URL, { headers })
      .pipe(
        tap(() => {
          this.state.update((state) => ({
            ...state,
            entries: [],
            pageNumber: 1,
            totalItems: 0,
          }));
          this.notificationService.show('Audit log cleared successfully.');
        }),
      );
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

    console.error('GlobalAuditLogService Error:', errorMessage);
    this.state.update((state) => ({
      ...state,
      loading: false,
      error: errorMessage,
    }));
  }
}

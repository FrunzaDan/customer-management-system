import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuditLogEntry } from '../interfaces/audit-log-entry';
import { GenericResponse } from '../interfaces/generic-response';
import { HttpHeaderService } from './http-header-service';
import { extractErrorMessage } from '../utils/extract-error-message';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private readonly API_URL = `${environment.CustomerManagementSystemAPI}/api/Customer/auditLog`;

  private readonly state = signal({
    entries: [] as AuditLogEntry[],
    loading: false,
    error: null as string | null,
  });

  public readonly entriesSignal = computed(() => this.state().entries);
  public readonly loadingSignal = computed(() => this.state().loading);
  public readonly errorSignal = computed(() => this.state().error);

  constructor(
    private http: HttpClient,
    private httpHeaderService: HttpHeaderService,
  ) {}

  loadAuditLog(customerGuid: string): void {
    this.state.update((state) => ({ ...state, loading: true, error: null }));

    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    const params = new HttpParams().set('customerGuid', customerGuid);

    this.http
      .get<GenericResponse<AuditLogEntry[]>>(this.API_URL, { headers, params })
      .subscribe({
        next: (response) => {
          this.state.update((state) => ({
            ...state,
            entries: response?.data ?? [],
            loading: false,
          }));
        },
        error: (error: HttpErrorResponse) => {
          this.state.update((state) => ({
            ...state,
            loading: false,
            error: extractErrorMessage(error),
          }));
        },
      });
  }
}

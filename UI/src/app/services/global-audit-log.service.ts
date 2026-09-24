import {
  HttpClient,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import {
  computed,
  inject,
  Injectable,
  linkedSignal,
  signal,
} from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { extractErrorMessage } from '../utils/extract-error-message';
import { GenericResponse } from '../interfaces/generic-response';
import { GlobalAuditLogEntry } from '../interfaces/global-audit-log-entry';
import { PagedResponse } from '../interfaces/paged-response';
import { NotificationService } from './notification.service';

export interface LoadAllAuditLogParams {
  pageNumber: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 50;

@Injectable({
  providedIn: 'root',
})
export class GlobalAuditLogService {
  private readonly apiUrl = `${environment.apiUrl}/api/customer/audit-log/all`;

  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(NotificationService);

  private readonly params = signal<LoadAllAuditLogParams | undefined>(
    undefined,
  );

  private readonly entriesResource = httpResource<
    GenericResponse<PagedResponse<GlobalAuditLogEntry>>
  >(() => {
    const params = this.params();
    if (!params) return undefined;
    return {
      url: this.apiUrl,
      params: { pageNumber: params.pageNumber, pageSize: params.pageSize },
    };
  });

  private readonly page = linkedSignal<
    PagedResponse<GlobalAuditLogEntry> | undefined,
    PagedResponse<GlobalAuditLogEntry> | undefined
  >({
    source: () =>
      this.entriesResource.hasValue()
        ? (this.entriesResource.value().data ?? undefined)
        : undefined,
    computation: (page, previous) => page ?? previous?.value,
  });

  readonly entries = computed(() => this.page()?.items ?? []);
  readonly pageNumber = computed(
    () => this.page()?.pageNumber ?? this.params()?.pageNumber ?? 1,
  );
  readonly pageSize = computed(
    () => this.page()?.pageSize ?? this.params()?.pageSize ?? DEFAULT_PAGE_SIZE,
  );
  readonly totalItems = computed(() => this.page()?.totalItems ?? 0);
  readonly loading = this.entriesResource.isLoading;
  readonly error = computed(() => {
    const error = this.entriesResource.error();
    return error
      ? extractErrorMessage(
          error as HttpErrorResponse,
          'Failed to load the audit log',
        )
      : null;
  });

  loadAllAuditLog(params: LoadAllAuditLogParams): void {
    this.params.set({ ...params });
  }

  deleteAllAuditLog(): Observable<GenericResponse<object>> {
    return this.http.delete<GenericResponse<object>>(this.apiUrl).pipe(
      tap(() => {
        this.page.set({
          pageNumber: 1,
          pageSize: this.pageSize(),
          totalItems: 0,
          items: [],
        });
        this.notificationService.show('Audit log cleared successfully.');
      }),
    );
  }
}

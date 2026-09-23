import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuditLogEntry } from '../interfaces/audit-log-entry';
import { GenericResponse } from '../interfaces/generic-response';
import { extractErrorMessage } from '../utils/extract-error-message';
import { HttpHeaderService } from './http-header-service';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private readonly API_URL = `${environment.apiUrl}/api/customer/audit-log`;
  private readonly httpHeaderService = inject(HttpHeaderService);

  private readonly customerId = signal<string | undefined>(undefined);

  // Declarative fetch: the request is a function of `customerId`, so a new
  // customerId cancels the in-flight request and starts another, and no request is
  // made at all until a customerId has been set (returning undefined idles it).
  private readonly auditLog = httpResource<GenericResponse<AuditLogEntry[]>>(
    () => {
      const customerId = this.customerId();
      if (!customerId) return undefined;
      return {
        url: this.API_URL,
        params: { customerId: customerId },
        headers: this.httpHeaderService.getHeadersWithTokenSet(),
      };
    },
  );

  // hasValue() guards the read: value() throws while the resource is in error.
  public readonly entriesSignal = computed(() =>
    this.auditLog.hasValue() ? (this.auditLog.value().data ?? []) : [],
  );
  public readonly loadingSignal = this.auditLog.isLoading;
  public readonly errorSignal = computed(() => {
    const error = this.auditLog.error();
    return error ? extractErrorMessage(error as HttpErrorResponse) : null;
  });

  loadAuditLog(customerId: string): void {
    if (this.customerId() === customerId) {
      // Same customer (e.g. after a deactivate/reactivate) — the request itself
      // hasn't changed, so ask for a fresh copy.
      this.auditLog.reload();
    } else {
      this.customerId.set(customerId);
    }
  }
}

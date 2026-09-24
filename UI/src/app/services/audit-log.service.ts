import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuditLogEntry } from '../interfaces/audit-log-entry';
import { GenericResponse } from '../interfaces/generic-response';
import { extractErrorMessage } from '../utils/extract-error-message';

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private readonly apiUrl = `${environment.apiUrl}/api/customer/audit-log`;

  private readonly customerId = signal<string | undefined>(undefined);

  private readonly auditLogResource = httpResource<
    GenericResponse<AuditLogEntry[]>
  >(() => {
    const customerId = this.customerId();
    if (!customerId) return undefined;
    return {
      url: this.apiUrl,
      params: { customerId: customerId },
    };
  });

  readonly entries = computed(() =>
    this.auditLogResource.hasValue()
      ? (this.auditLogResource.value().data ?? [])
      : [],
  );
  readonly loading = this.auditLogResource.isLoading;
  readonly error = computed(() => {
    const error = this.auditLogResource.error();
    return error
      ? extractErrorMessage(
          error as HttpErrorResponse,
          'Failed to load the audit trail',
        )
      : null;
  });

  loadAuditLog(customerId: string): void {
    if (this.customerId() === customerId) {
      this.auditLogResource.reload();
    } else {
      this.customerId.set(customerId);
    }
  }
}

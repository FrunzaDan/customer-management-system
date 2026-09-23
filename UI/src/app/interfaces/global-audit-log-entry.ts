import { AuditAction } from './audit-log-entry';
import { IsoDateTime } from './iso-date';

export interface GlobalAuditLogEntry {
  auditId: number;
  customerGuid: string;
  // Absent when the customer no longer exists (the API LEFT JOINs Customer, since audit
  // history outlives a deleted customer, and omits null properties).
  customerFirstName?: string;
  customerLastName?: string;
  merchantId: string;
  action: AuditAction;
  details?: string;
  actionDate: IsoDateTime;
}

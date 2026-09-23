import { AuditAction } from './audit-log-entry';
import { IsoDateTime } from './iso-date';

export interface GlobalAuditLogEntry {
  customerAuditLogId: number;
  customerId: string;
  // Absent when the customer no longer exists (the API LEFT JOINs Customer, since audit
  // history outlives a deleted customer, and omits null properties).
  customerFirstName?: string;
  customerLastName?: string;
  performedBy: string;
  actionType: AuditAction;
  details?: string;
  occurredAt: IsoDateTime;
}

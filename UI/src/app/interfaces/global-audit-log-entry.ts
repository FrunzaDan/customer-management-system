import { AuditAction } from './audit-log-entry';
import { IsoDateTime } from './iso-date';

export interface GlobalAuditLogEntry {
  customerAuditLogId: number;
  customerId: string;
  // null when the customer no longer exists (the API LEFT JOINs Customer, since audit
  // history outlives a deleted customer).
  customerFirstName: string | null;
  customerLastName: string | null;
  performedBy: string;
  actionType: AuditAction;
  details: string | null;
  occurredAt: IsoDateTime;
}

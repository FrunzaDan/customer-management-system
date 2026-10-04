import { IsoDateTime } from './iso-date';

export type AuditAction =
  | 'Created'
  | 'Edited'
  | 'Deactivated'
  | 'Reactivated'
  | 'Deleted'
  | 'Purchased';

export interface AuditLogEntry {
  customerAuditLogId: number;
  customerId: string;
  performedBy: string;
  actionType: AuditAction;
  details: string | null;
  occurredAt: IsoDateTime;
}

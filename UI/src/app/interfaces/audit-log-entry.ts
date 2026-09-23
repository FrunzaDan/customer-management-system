import { IsoDateTime } from './iso-date';

// CustomerAuditLog.ActionType — serialized by the API by name.
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
  // NULL in the DB when there are none, sent as null.
  details: string | null;
  occurredAt: IsoDateTime;
}

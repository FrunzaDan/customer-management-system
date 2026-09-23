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
  // Optional in the DB; the API omits it when there are none.
  details?: string;
  occurredAt: IsoDateTime;
}

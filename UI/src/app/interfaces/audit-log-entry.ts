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
  auditId: number;
  customerGuid: string;
  merchantId: string;
  action: AuditAction;
  // Optional in the DB; the API omits it when there are none.
  details?: string;
  actionDate: IsoDateTime;
}

export interface AuditLogEntry {
  auditId: number;
  customerGuid: string;
  merchantId: string;
  action: string;
  details: string;
  actionDate: string;
}

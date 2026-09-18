export interface GlobalAuditLogEntry {
  auditId: number;
  customerGuid: string;
  // Null when the customer no longer exists (the API LEFT JOINs tbl_customers,
  // since audit history outlives a deleted customer).
  customerFirstName: string | null;
  customerLastName: string | null;
  merchantId: string;
  action: string;
  details: string;
  actionDate: string;
}

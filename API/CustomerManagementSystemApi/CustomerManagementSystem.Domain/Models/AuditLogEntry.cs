namespace CustomerManagementSystem.Domain.Models;

public class AuditLogEntry
{
    public int AuditId { get; set; }

    public string? CustomerGuid { get; set; }

    public string? MerchantId { get; set; }

    public string? Action { get; set; }

    public string? Details { get; set; }

    public DateTime ActionDate { get; set; }
}

public class GlobalAuditLogEntry
{
    public int AuditId { get; set; }

    public string? CustomerGuid { get; set; }

    // Null when the customer no longer exists (usp_getAllCustomerAuditLog LEFT
    // JOINs tbl_customers, since audit history outlives a deleted customer).
    public string? CustomerFirstName { get; set; }

    public string? CustomerLastName { get; set; }

    public string? MerchantId { get; set; }

    public string? Action { get; set; }

    public string? Details { get; set; }

    public DateTime ActionDate { get; set; }
}

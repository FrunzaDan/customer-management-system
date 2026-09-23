namespace CustomerManagementSystem.Domain.Models;

public sealed record AuditLogEntry
{
    public required int AuditId { get; init; }

    public required Guid CustomerGuid { get; init; }

    public required string MerchantId { get; init; }

    public required AuditAction Action { get; init; }

    public string? Details { get; init; }

    // UTC.
    public required DateTime ActionDate { get; init; }
}

public sealed record GlobalAuditLogEntry
{
    public required int AuditId { get; init; }

    public required Guid CustomerGuid { get; init; }

    // Null when the customer no longer exists (usp_getAllCustomerAuditLog LEFT
    // JOINs tbl_customers, since audit history outlives a deleted customer).
    public string? CustomerFirstName { get; init; }

    public string? CustomerLastName { get; init; }

    public required string MerchantId { get; init; }

    public required AuditAction Action { get; init; }

    public string? Details { get; init; }

    // UTC.
    public required DateTime ActionDate { get; init; }
}

namespace CustomerManagementSystem.Domain.Models;

public sealed record AuditLogEntry
{
    public required int CustomerAuditLogId { get; init; }

    public required Guid CustomerId { get; init; }

    public required string PerformedBy { get; init; }

    public required AuditAction ActionType { get; init; }

    public string? Details { get; init; }

    public required DateTime OccurredAt { get; init; }
}

public sealed record GlobalAuditLogEntry
{
    public required int CustomerAuditLogId { get; init; }

    public required Guid CustomerId { get; init; }

    public string? CustomerFirstName { get; init; }

    public string? CustomerLastName { get; init; }

    public required string PerformedBy { get; init; }

    public required AuditAction ActionType { get; init; }

    public string? Details { get; init; }

    public required DateTime OccurredAt { get; init; }
}

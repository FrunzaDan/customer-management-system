namespace CustomerManagementSystem.Domain.Models;

public sealed record PurchaseModel
{
    public required int CustomerPurchaseId { get; init; }

    public required Guid CustomerId { get; init; }

    public required Guid ProductId { get; init; }

    public required string ProductName { get; init; }

    public required string Category { get; init; }

    public required decimal Price { get; init; }

    public required DateTime PurchasedAt { get; init; }
}

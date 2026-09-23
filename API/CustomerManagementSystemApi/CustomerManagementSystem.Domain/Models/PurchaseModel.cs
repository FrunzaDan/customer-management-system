namespace CustomerManagementSystem.Domain.Models;

// One row of a customer's purchase history: the CustomerPurchase link row joined to
// the product it points at.
public sealed record PurchaseModel
{
    public required int CustomerPurchaseId { get; init; }

    public required Guid CustomerId { get; init; }

    public required Guid ProductId { get; init; }

    public required string ProductName { get; init; }

    public required string Category { get; init; }

    // The product's current price — not a snapshot of what was paid at purchase time.
    public required decimal Price { get; init; }

    // UTC.
    public required DateTime PurchasedAt { get; init; }
}

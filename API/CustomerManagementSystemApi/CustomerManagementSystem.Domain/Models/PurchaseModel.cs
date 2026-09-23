namespace CustomerManagementSystem.Domain.Models;

// One row of a customer's purchase history: the CustomerPurchase link row joined to
// the product it points at.
public sealed record PurchaseModel
{
    public required int PurchaseId { get; init; }

    public required Guid CustomerGuid { get; init; }

    public required Guid ProductGuid { get; init; }

    public required string ProductName { get; init; }

    public required string Category { get; init; }

    // The product's current price — not a snapshot of what was paid at purchase time.
    public required decimal Price { get; init; }

    // UTC.
    public required DateTime PurchaseDate { get; init; }
}

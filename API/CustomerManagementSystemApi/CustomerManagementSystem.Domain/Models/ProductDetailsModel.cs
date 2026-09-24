namespace CustomerManagementSystem.Domain.Models;

public sealed record ProductDetailsModel
{
    public required ProductModel Product { get; init; }

    public required IReadOnlyList<ProductBuyerModel> Buyers { get; init; }
}

public sealed record ProductBuyerModel
{
    public required int CustomerPurchaseId { get; init; }

    public required Guid CustomerId { get; init; }

    public required string CustomerFirstName { get; init; }

    public required string CustomerLastName { get; init; }

    public required string CustomerEmail { get; init; }

    public required DateTime PurchasedAt { get; init; }
}

namespace CustomerManagementSystem.Domain.Models;

public sealed record ProductDetailsModel
{
    public required ProductModel Product { get; init; }

    // Newest first. Only customers that still exist appear (deleting a customer deletes their
    // purchase rows), so this can hold fewer entries than Product.SoldQuantity.
    public required IReadOnlyList<ProductBuyerModel> Buyers { get; init; }
}

// One purchase of a product, from the product's side: who bought it and when.
public sealed record ProductBuyerModel
{
    public required int PurchaseId { get; init; }

    public required Guid CustomerGuid { get; init; }

    public required string CustomerFirstName { get; init; }

    public required string CustomerLastName { get; init; }

    public required string CustomerEmail { get; init; }

    // UTC.
    public required DateTime PurchaseDate { get; init; }
}

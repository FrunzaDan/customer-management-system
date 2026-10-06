namespace CustomerManagementSystem.Domain.Models;

public sealed record ProductModel
{
    public required Guid ProductId { get; init; }

    public required string Name { get; init; }

    public required string Category { get; init; }

    public string? Description { get; init; }

    public required decimal Price { get; init; }

    public required int InitialQuantity { get; init; }

    public required int QuantityOnHand { get; init; }

    public required int SoldQuantity { get; init; }

    public required string Warehouse { get; init; }
}

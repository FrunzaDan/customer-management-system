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

public sealed class CreateProductRequest
{
    public string? Name { get; set; }

    public string? Category { get; set; }

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public int InitialQuantity { get; set; }

    public string? Warehouse { get; set; }
}

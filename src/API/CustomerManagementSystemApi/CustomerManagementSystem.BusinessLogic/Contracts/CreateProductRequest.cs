namespace CustomerManagementSystem.BusinessLogic.Contracts;

public sealed class CreateProductRequest
{
    public string? Name { get; set; }

    public string? Category { get; set; }

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public int InitialQuantity { get; set; }

    public string? Warehouse { get; set; }
}

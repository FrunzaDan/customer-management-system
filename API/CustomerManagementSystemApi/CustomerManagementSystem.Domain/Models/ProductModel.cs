namespace CustomerManagementSystem.Domain.Models;

public class ProductModel
{
    public string? Guid { get; set; }

    public string? Name { get; set; }

    public string? Category { get; set; }

    public string? Comment { get; set; }

    public decimal Price { get; set; }

    // Units originally stocked (never changes).
    public int InventoryQuantity { get; set; }

    // Units left on hand.
    public int StockQuantity { get; set; }

    // Units sold: InventoryQuantity - StockQuantity, derived in SQL rather than counted from
    // the purchase rows, so it stays consistent with StockQuantity even after a customer
    // (and their purchase rows) is deleted.
    public int SoldQuantity { get; set; }

    // The depot (warehouse) the stock is held in.
    public string? Depot { get; set; }
}

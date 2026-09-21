namespace CustomerManagementSystem.Domain.Models;

public class ProductDetailsModel
{
    public ProductModel? Product { get; set; }

    // Newest first. Only customers that still exist appear (deleting a customer deletes their
    // purchase rows), so this can hold fewer entries than Product.SoldQuantity.
    public List<ProductBuyerModel> Buyers { get; set; } = [];
}

// One purchase of a product, from the product's side: who bought it and when.
public class ProductBuyerModel
{
    public int PurchaseId { get; set; }

    public string? CustomerGuid { get; set; }

    public string? CustomerFirstName { get; set; }

    public string? CustomerLastName { get; set; }

    public string? CustomerEmail { get; set; }

    public DateTime PurchaseDate { get; set; }
}

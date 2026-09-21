namespace CustomerManagementSystem.Domain.Models;

// One row of a customer's purchase history: the tbl_customer_purchases link row joined to
// the product it points at.
public class PurchaseModel
{
    public int PurchaseId { get; set; }

    public string? CustomerGuid { get; set; }

    public string? ProductGuid { get; set; }

    public string? ProductName { get; set; }

    public string? Category { get; set; }

    // The product's current price — not a snapshot of what was paid at purchase time.
    public decimal Price { get; set; }

    public DateTime PurchaseDate { get; set; }
}

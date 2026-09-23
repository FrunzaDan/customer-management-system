CREATE PROCEDURE [dbo].[CustomerPurchase_ListByCustomer]
    @CustomerId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- Price is the product's *current* price, not a snapshot of what was paid.
    SELECT
        cp.CustomerPurchaseId,
        cp.CustomerId,
        cp.ProductId,
        p.Name AS ProductName,
        p.Category,
        p.Price,
        cp.PurchasedAt
    FROM dbo.CustomerPurchase AS cp
    INNER JOIN dbo.Product AS p ON p.ProductId = cp.ProductId
    WHERE cp.CustomerId = @CustomerId
    ORDER BY cp.PurchasedAt DESC, cp.CustomerPurchaseId DESC;
END

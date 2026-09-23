CREATE PROCEDURE [dbo].[Product_GetDetails]
    @ProductId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- Result set 1: the product (zero rows = not found; the API maps that to 404).
    SELECT
        ProductId,
        Name,
        Category,
        Description,
        Price,
        InitialQuantity,
        QuantityOnHand,
        InitialQuantity - QuantityOnHand AS SoldQuantity,
        Warehouse
    FROM dbo.Product
    WHERE ProductId = @ProductId;

    -- Result set 2: who bought it and when, newest first. Only customers that still exist
    -- appear here (deleting a customer deletes their purchase rows), so this can list fewer
    -- rows than the derived SoldQuantity above.
    SELECT
        cp.CustomerPurchaseId,
        cp.CustomerId,
        c.FirstName,
        c.LastName,
        c.Email,
        cp.PurchasedAt
    FROM dbo.CustomerPurchase AS cp
    INNER JOIN dbo.Customer AS c ON c.CustomerId = cp.CustomerId
    WHERE cp.ProductId = @ProductId
    ORDER BY cp.PurchasedAt DESC, cp.CustomerPurchaseId DESC;
END

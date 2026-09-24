CREATE PROCEDURE [dbo].[Product_GetDetails]
    @ProductId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

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

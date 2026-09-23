CREATE PROCEDURE [dbo].[Product_List]
AS
BEGIN
    SET NOCOUNT ON;

    -- Deliberately unpaginated: the catalogue is a fixed set of 50 products.
    -- SoldQuantity is derived (initial - on hand), not counted from CustomerPurchase —
    -- see Product for why.
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
    ORDER BY Category, Name;
END

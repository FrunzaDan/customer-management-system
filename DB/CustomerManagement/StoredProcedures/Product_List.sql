CREATE PROCEDURE [dbo].[Product_List]
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
    ORDER BY Category, Name;
END

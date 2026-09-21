CREATE PROCEDURE [dbo].[usp_getProducts]
AS
BEGIN
    SET NOCOUNT ON;

    -- Deliberately unpaginated: the catalogue is a fixed set of 50 products.
    -- sold_quantity is derived (inventory - left), not counted from tbl_customer_purchases —
    -- see tbl_products for why.
    SELECT
        PK_product_guid,
        product_name,
        category,
        comment,
        price,
        inventory_quantity,
        stock_quantity,
        inventory_quantity - stock_quantity AS sold_quantity,
        depot
    FROM dbo.tbl_products
    ORDER BY category, product_name;
END

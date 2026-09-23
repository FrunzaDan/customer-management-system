CREATE PROCEDURE [dbo].[usp_getProductDetails]
    @var_ProductGuid UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- Result set 1: the product (zero rows = not found; the API maps that to 404).
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
    WHERE PK_product_guid = @var_ProductGuid;

    -- Result set 2: who bought it and when, newest first. Only customers that still exist
    -- appear here (deleting a customer deletes their purchase rows), so this can list fewer
    -- rows than the derived sold_quantity above.
    SELECT
        cp.purchase_id,
        cp.FK_customer_guid,
        c.first_name,
        c.last_name,
        c.email,
        cp.purchase_date
    FROM dbo.tbl_customer_purchases cp
    INNER JOIN dbo.tbl_customers c ON c.PK_customer_guid = cp.FK_customer_guid
    WHERE cp.FK_product_guid = @var_ProductGuid
    ORDER BY cp.purchase_date DESC, cp.purchase_id DESC;
END

CREATE PROCEDURE [dbo].[usp_getCustomerPurchases]
    @var_CustomerGuid UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- price is the product's *current* price, not a snapshot of what was paid.
    SELECT
        cp.purchase_id,
        cp.FK_customer_guid,
        cp.FK_product_guid,
        p.product_name,
        p.category,
        p.price,
        cp.purchase_date
    FROM dbo.tbl_customer_purchases cp
    INNER JOIN dbo.tbl_products p ON p.PK_product_guid = cp.FK_product_guid
    WHERE cp.FK_customer_guid = @var_CustomerGuid
    ORDER BY cp.purchase_date DESC, cp.purchase_id DESC;
END

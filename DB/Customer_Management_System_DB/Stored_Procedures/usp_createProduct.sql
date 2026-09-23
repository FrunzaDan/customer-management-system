CREATE PROCEDURE [dbo].[usp_createProduct]
    @var_Name NVARCHAR(100),
    @var_Category NVARCHAR(50),
    @var_Price DECIMAL(10, 2),
    @var_InventoryQuantity INT,
    @var_Depot NVARCHAR(100),
    @var_Comment NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @result INT;
    DECLARE @message NVARCHAR(255);
    DECLARE @productGuid UNIQUEIDENTIFIER = NULL;
    DECLARE @inserted TABLE (product_guid UNIQUEIDENTIFIER);

    BEGIN TRY
        -- A newly added product starts fully stocked: stock_quantity = inventory_quantity,
        -- same as every seeded row (see tbl_products / post-deployment seed).
        -- PK_product_guid comes from the table's NEWSEQUENTIALID() default.
        INSERT INTO dbo.tbl_products
        (
            product_name, category, comment,
            price, inventory_quantity, stock_quantity, depot
        )
        OUTPUT inserted.PK_product_guid INTO @inserted
        VALUES
        (
            @var_Name, @var_Category, @var_Comment,
            @var_Price, @var_InventoryQuantity, @var_InventoryQuantity, @var_Depot
        );

        SELECT @productGuid = product_guid FROM @inserted;

        SET @result = 0;
        SET @message = 'Product created successfully.';
    END TRY
    BEGIN CATCH
        SET @result = 500;
        SET @message = CONCAT('Failed to create product: ', ERROR_MESSAGE());
    END CATCH

    -- product_guid: the new product's server-generated key; only meaningful when result = 0.
    SELECT @result AS result, @message AS message, @productGuid AS product_guid;
END

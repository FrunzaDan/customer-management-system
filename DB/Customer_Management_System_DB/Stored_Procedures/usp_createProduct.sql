CREATE PROCEDURE [dbo].[usp_createProduct]
    @var_Guid NVARCHAR(50),
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

    BEGIN TRY
        -- A newly added product starts fully stocked: stock_quantity = inventory_quantity,
        -- same as every seeded row (see tbl_products / post-deployment seed).
        INSERT INTO dbo.tbl_products
        (
            PK_product_guid, product_name, category, comment,
            price, inventory_quantity, stock_quantity, depot
        )
        VALUES
        (
            @var_Guid, @var_Name, @var_Category, @var_Comment,
            @var_Price, @var_InventoryQuantity, @var_InventoryQuantity, @var_Depot
        );

        SET @result = 0;
        SET @message = CONCAT('Product created successfully. GUID: ', @var_Guid);
    END TRY
    BEGIN CATCH
        SET @result = 500;
        SET @message = CONCAT('Failed to create product: ', ERROR_MESSAGE());
    END CATCH

    SELECT @result AS result, @message AS message;
END

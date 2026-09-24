CREATE PROCEDURE [dbo].[Product_Create]
    @Name NVARCHAR(100),
    @Category NVARCHAR(50),
    @Price DECIMAL(12, 2),
    @InitialQuantity INT,
    @Warehouse NVARCHAR(100),
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Result INT;
    DECLARE @Message NVARCHAR(255);
    DECLARE @ProductId UNIQUEIDENTIFIER = NULL;
    DECLARE @Inserted TABLE (ProductId UNIQUEIDENTIFIER);

    INSERT INTO dbo.Product
    (
        Name, Category, Description,
        Price, InitialQuantity, QuantityOnHand, Warehouse
    )
    OUTPUT inserted.ProductId INTO @Inserted
    VALUES
    (
        @Name, @Category, @Description,
        @Price, @InitialQuantity, @InitialQuantity, @Warehouse
    );

    SELECT @ProductId = ProductId FROM @Inserted;

    SET @Result = 0;
    SET @Message = 'Product created successfully.';

    SELECT @Result AS Result, @Message AS Message, @ProductId AS ProductId;
END

CREATE PROCEDURE [dbo].[CustomerPurchase_Create]
    @CustomerId UNIQUEIDENTIFIER,
    @ProductId UNIQUEIDENTIFIER,
    -- Only test customers can have a purchase dated in the past, so the
    -- generator can spread their purchases out; real ones are dated now.
    @PurchasedAt DATETIME2 (3) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Result INT;
    DECLARE @Message NVARCHAR(255);
    DECLARE @ProductName NVARCHAR(100) = NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Customer
        WHERE CustomerId = @CustomerId
    )
    BEGIN
        SET @Result = 404;
        SET @Message = 'Customer not found.';
    END
    ELSE IF EXISTS (
        SELECT 1
        FROM dbo.Customer
        WHERE CustomerId = @CustomerId AND StatusCode = 1903
    )
    BEGIN
        SET @Result = 409;
        SET @Message = 'A deactivated customer cannot make purchases.';
    END
    ELSE IF @PurchasedAt IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM dbo.Customer
        WHERE CustomerId = @CustomerId AND StatusCode = 1904
    )
    BEGIN
        SET @Result = 400;
        SET @Message = 'Only test customers can have a purchase dated in the past.';
    END
    ELSE IF @PurchasedAt IS NOT NULL AND EXISTS (
        SELECT 1
        FROM dbo.Customer
        WHERE CustomerId = @CustomerId AND CAST(@PurchasedAt AS DATE) < EnrollmentDate
    )
    BEGIN
        SET @Result = 400;
        SET @Message = 'A purchase cannot be dated before the customer enrolled.';
    END
    ELSE IF NOT EXISTS (
        SELECT 1
        FROM dbo.Product
        WHERE ProductId = @ProductId
    )
    BEGIN
        SET @Result = 404;
        SET @Message = 'Product not found.';
    END
    ELSE
    BEGIN
        SELECT @ProductName = Name
        FROM dbo.Product
        WHERE ProductId = @ProductId;

        BEGIN TRY
            BEGIN TRANSACTION;

            UPDATE dbo.Product
            SET QuantityOnHand = QuantityOnHand - 1
            WHERE ProductId = @ProductId AND QuantityOnHand > 0;

            IF @@ROWCOUNT = 0
            BEGIN
                ROLLBACK TRANSACTION;

                SET @Result = 409;
                SET @Message = 'Product is out of stock.';
            END
            ELSE
            BEGIN
                INSERT INTO dbo.CustomerPurchase (CustomerId, ProductId, PurchasedAt)
                VALUES (@CustomerId, @ProductId, COALESCE(@PurchasedAt, SYSUTCDATETIME()));

                COMMIT TRANSACTION;

                SET @Result = 0;
                SET @Message = 'Purchase recorded successfully.';
            END
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            THROW;
        END CATCH
    END

    SELECT @Result AS Result, @Message AS Message, @ProductName AS ProductName;
END

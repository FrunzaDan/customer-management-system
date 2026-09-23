CREATE PROCEDURE [dbo].[CustomerPurchase_Create]
    @CustomerId UNIQUEIDENTIFIER,
    @ProductId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

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

        -- The stock decrement and the purchase row must succeed together: a decremented
        -- stock with no purchase row (or the reverse) would leave the two tables disagreeing.
        BEGIN TRY
            BEGIN TRANSACTION;

            -- The "QuantityOnHand > 0" guard sits in the UPDATE itself (not a separate
            -- read-then-write), so two concurrent buyers of the last unit can't both succeed.
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
                VALUES (@CustomerId, @ProductId, SYSUTCDATETIME());

                COMMIT TRANSACTION;

                SET @Result = 0;
                SET @Message = 'Purchase recorded successfully.';
            END
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            SET @Result = 500;
            SET @Message = CONCAT('Failed to record purchase: ', ERROR_MESSAGE());
        END CATCH
    END

    -- ProductName rides along on the usual (Result, Message) row so the API can put it in
    -- the audit-log entry without a second query; only meaningful when Result = 0.
    SELECT @Result AS Result, @Message AS Message, @ProductName AS ProductName;
END

CREATE PROCEDURE [dbo].[Customer_Delete]
    @CustomerId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Result INT;
    DECLARE @Message NVARCHAR(255);

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Customer
        WHERE CustomerId = @CustomerId
    )
    BEGIN
        SET @Result = 404;
        SET @Message = 'Customer not found.';
    END
    ELSE IF NOT EXISTS (
        SELECT 1
        FROM dbo.Customer
        WHERE CustomerId = @CustomerId AND StatusCode IN (1903, 1904)
    )
    BEGIN
        SET @Result = 409;
        SET @Message = 'Customer must be deactivated before it can be deleted.';
    END
    ELSE
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            DELETE FROM dbo.CustomerPurchase
            WHERE CustomerId = @CustomerId;

            DELETE FROM dbo.CustomerAddress
            WHERE CustomerId = @CustomerId;

            DELETE FROM dbo.Customer
            WHERE CustomerId = @CustomerId;

            COMMIT TRANSACTION;

            SET @Result = 0;
            SET @Message = 'Customer deleted successfully.';
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            THROW;
        END CATCH
    END

    SELECT @Result AS Result, @Message AS Message;
END

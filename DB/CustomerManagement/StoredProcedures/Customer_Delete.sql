CREATE PROCEDURE [dbo].[Customer_Delete]
    @CustomerId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

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
        -- 1903 (deactivated): the normal deactivate-then-delete lifecycle.
        -- 1904 (test): fictitious demo data, exempt from that guardrail so it
        -- can be deleted directly.
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
        -- Both deletes must succeed together: Customer_Get/Customer_List
        -- INNER JOIN to CustomerAddress, so a Customer row left behind without
        -- its CustomerAddress row (e.g. the second DELETE fails after the first
        -- already committed) would silently disappear from every read despite
        -- still existing — mirrors Customer_Create's TRY/CATCH for the same
        -- two-table-consistency reason.
        BEGIN TRY
            BEGIN TRANSACTION;

            -- Purchases FK to Customer, so they have to go before the customer row
            -- (they're the customer's own data, unlike the audit log, which is kept).
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

            SET @Result = 500;
            SET @Message = CONCAT('Failed to delete customer: ', ERROR_MESSAGE());
        END CATCH
    END

    SELECT @Result AS Result, @Message AS Message;
END

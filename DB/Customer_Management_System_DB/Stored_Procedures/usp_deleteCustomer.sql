CREATE PROCEDURE [dbo].[usp_deleteCustomer]
    @var_Guid NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @result INT;
    DECLARE @message NVARCHAR(255);

    IF NOT EXISTS (
        SELECT 1
        FROM tbl_customers
        WHERE PK_customer_guid = @var_Guid
    )
    BEGIN
        SET @result = 404;
        SET @message = 'Customer not found.';
    END
    ELSE IF NOT EXISTS (
        -- 1903 (deactivated): the normal deactivate-then-delete lifecycle.
        -- 1904 (test): fictitious demo data, exempt from that guardrail so it
        -- can be deleted directly.
        SELECT 1
        FROM tbl_customers
        WHERE PK_customer_guid = @var_Guid AND customer_Status IN (1903, 1904)
    )
    BEGIN
        SET @result = 409;
        SET @message = 'Customer must be deactivated before it can be deleted.';
    END
    ELSE
    BEGIN
        -- Both deletes must succeed together: usp_getCustomer/usp_getCustomers
        -- INNER JOIN to tbl_addresses, so a tbl_customers row left behind without
        -- its tbl_addresses row (e.g. the second DELETE fails after the first
        -- already committed) would silently disappear from every read despite
        -- still existing — mirrors usp_createCustomer's TRY/CATCH for the same
        -- two-table-consistency reason.
        BEGIN TRY
            BEGIN TRANSACTION;

            DELETE FROM tbl_addresses
            WHERE FK_customer_guid = @var_Guid;

            DELETE FROM tbl_customers
            WHERE PK_customer_guid = @var_Guid;

            COMMIT TRANSACTION;

            SET @result = 0;
            SET @message = 'Customer deleted successfully.';
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            SET @result = 500;
            SET @message = CONCAT('Failed to delete customer: ', ERROR_MESSAGE());
        END CATCH
    END

    SELECT @result AS result, @message AS message;
END

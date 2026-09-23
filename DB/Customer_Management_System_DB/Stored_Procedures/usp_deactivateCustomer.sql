CREATE PROCEDURE [dbo].[usp_deactivateCustomer]
    @var_Guid UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @result INT;
    DECLARE @message NVARCHAR(255);

    IF EXISTS (
        SELECT 1
        FROM tbl_customers
        WHERE PK_customer_guid = @var_Guid
    )
    BEGIN
        DECLARE @currDate DATETIME2(0) = SYSUTCDATETIME();

        UPDATE tbl_customers
        SET 
            interaction_Date = @currDate,
            customer_Status = 1903
        WHERE PK_customer_guid = @var_Guid AND customer_Status <> 1903; -- Prevent update if already deactivated

        IF @@ROWCOUNT > 0
        BEGIN
            SET @result = 0;
            SET @message = 'Customer deactivated successfully.';
        END
        ELSE
        BEGIN
            SET @result = 409;
            SET @message = 'Customer already deactivated or update failed.';
        END
    END
    ELSE
    BEGIN
        SET @result = 404;
        SET @message = 'Customer not found.';
    END

    SELECT @result AS result, @message AS message;
END

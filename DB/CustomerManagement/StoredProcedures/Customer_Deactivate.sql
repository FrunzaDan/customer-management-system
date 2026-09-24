CREATE PROCEDURE [dbo].[Customer_Deactivate]
    @CustomerId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Result INT;
    DECLARE @Message NVARCHAR(255);

    IF EXISTS (
        SELECT 1
        FROM dbo.Customer
        WHERE CustomerId = @CustomerId
    )
    BEGIN
        DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();

        UPDATE dbo.Customer
        SET
            LastInteractionAt = @Now,
            StatusCode = 1903
        WHERE CustomerId = @CustomerId AND StatusCode <> 1903; -- Prevent update if already deactivated

        IF @@ROWCOUNT > 0
        BEGIN
            SET @Result = 0;
            SET @Message = 'Customer deactivated successfully.';
        END
        ELSE
        BEGIN
            SET @Result = 409;
            SET @Message = 'Customer is already deactivated.';
        END
    END
    ELSE
    BEGIN
        SET @Result = 404;
        SET @Message = 'Customer not found.';
    END

    SELECT @Result AS Result, @Message AS Message;
END

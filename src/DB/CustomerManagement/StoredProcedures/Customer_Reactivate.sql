CREATE PROCEDURE [dbo].[Customer_Reactivate]
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
            StatusCode = ISNULL(StatusCodeBeforeDeactivation, 1901),
            StatusCodeBeforeDeactivation = NULL
        WHERE CustomerId = @CustomerId AND StatusCode = 1903;

        IF @@ROWCOUNT > 0
        BEGIN
            SET @Result = 0;
            SET @Message = 'Customer reactivated successfully.';
        END
        ELSE
        BEGIN
            SET @Result = 409;
            SET @Message = 'Customer is not deactivated.';
        END
    END
    ELSE
    BEGIN
        SET @Result = 404;
        SET @Message = 'Customer not found.';
    END

    SELECT @Result AS Result, @Message AS Message;
END

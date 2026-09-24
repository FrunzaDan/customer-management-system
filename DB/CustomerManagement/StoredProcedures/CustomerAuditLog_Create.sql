CREATE PROCEDURE [dbo].[CustomerAuditLog_Create]
    @CustomerId UNIQUEIDENTIFIER,
    @PerformedBy NVARCHAR(50),
    @ActionType VARCHAR(20),
    @Details NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Result INT;
    DECLARE @Message NVARCHAR(255);

    INSERT INTO dbo.CustomerAuditLog
    (
        CustomerId, PerformedBy, ActionType, Details
    )
    VALUES
    (
        @CustomerId, @PerformedBy, @ActionType, @Details
    );

    SET @Result = 0;
    SET @Message = 'Audit log entry created.';

    SELECT @Result AS Result, @Message AS Message;
END

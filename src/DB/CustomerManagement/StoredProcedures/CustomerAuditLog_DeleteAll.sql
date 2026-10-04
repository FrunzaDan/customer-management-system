CREATE PROCEDURE [dbo].[CustomerAuditLog_DeleteAll]
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Result INT;
    DECLARE @Message NVARCHAR(255);

    DELETE FROM dbo.CustomerAuditLog;

    SET @Result = 0;
    SET @Message = 'Audit log cleared successfully.';

    SELECT @Result AS Result, @Message AS Message;
END

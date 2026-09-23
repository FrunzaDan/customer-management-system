CREATE PROCEDURE [dbo].[CustomerAuditLog_DeleteAll]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Result INT;
    DECLARE @Message NVARCHAR(255);

    BEGIN TRY
        DELETE FROM dbo.CustomerAuditLog;

        SET @Result = 0;
        SET @Message = 'Audit log cleared successfully.';
    END TRY
    BEGIN CATCH
        SET @Result = 500;
        SET @Message = CONCAT('Failed to clear audit log: ', ERROR_MESSAGE());
    END CATCH

    SELECT @Result AS Result, @Message AS Message;
END

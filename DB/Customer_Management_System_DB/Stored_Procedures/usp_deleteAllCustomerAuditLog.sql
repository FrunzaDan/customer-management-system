CREATE PROCEDURE [dbo].[usp_deleteAllCustomerAuditLog]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @result INT;
    DECLARE @message NVARCHAR(255);

    BEGIN TRY
        DELETE FROM tbl_customer_audit_log;

        SET @result = 0;
        SET @message = 'Audit log cleared successfully.';
    END TRY
    BEGIN CATCH
        SET @result = 500;
        SET @message = CONCAT('Failed to clear audit log: ', ERROR_MESSAGE());
    END CATCH

    SELECT @result AS result, @message AS message;
END

CREATE PROCEDURE [dbo].[usp_insertCustomerAuditLog]
    @var_CustomerGuid UNIQUEIDENTIFIER,
    @var_MerchantID NVARCHAR(50),
    @var_Action VARCHAR(20),
    @var_Details NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @result INT;
    DECLARE @message NVARCHAR(255);

    INSERT INTO dbo.tbl_customer_audit_log
    (
        customer_guid, merchant_id, action, details
    )
    VALUES
    (
        @var_CustomerGuid, @var_MerchantID, @var_Action, @var_Details
    );

    SET @result = 0;
    SET @message = 'Audit log entry created.';

    SELECT @result AS result, @message AS message;
END

CREATE PROCEDURE [dbo].[usp_getCustomerAuditLog]
    @var_CustomerGuid UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        audit_id,
        customer_guid,
        merchant_id,
        action,
        details,
        action_Date
    FROM dbo.tbl_customer_audit_log
    WHERE customer_guid = @var_CustomerGuid
    ORDER BY action_Date DESC, audit_id DESC;
END

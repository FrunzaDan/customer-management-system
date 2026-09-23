CREATE PROCEDURE [dbo].[CustomerAuditLog_ListByCustomer]
    @CustomerId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CustomerAuditLogId,
        CustomerId,
        PerformedBy,
        ActionType,
        Details,
        OccurredAt
    FROM dbo.CustomerAuditLog
    WHERE CustomerId = @CustomerId
    ORDER BY OccurredAt DESC, CustomerAuditLogId DESC;
END

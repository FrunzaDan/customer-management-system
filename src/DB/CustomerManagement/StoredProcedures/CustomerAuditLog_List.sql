CREATE PROCEDURE [dbo].[CustomerAuditLog_List]
    @PageNumber INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SELECT COUNT(*) AS TotalCount
    FROM dbo.CustomerAuditLog;

    SELECT
        l.CustomerAuditLogId,
        l.CustomerId,
        c.FirstName,
        c.LastName,
        l.PerformedBy,
        l.ActionType,
        l.Details,
        l.OccurredAt
    FROM
        dbo.CustomerAuditLog AS l
    LEFT JOIN
        dbo.Customer AS c
        ON c.CustomerId = l.CustomerId
    ORDER BY
        l.OccurredAt DESC, l.CustomerAuditLogId DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END

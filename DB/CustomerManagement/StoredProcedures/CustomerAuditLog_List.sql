CREATE PROCEDURE [dbo].[CustomerAuditLog_List]
    @PageNumber INT = 1,
    @PageSize INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    -- LEFT JOIN, not INNER: CustomerAuditLog has no FK to Customer
    -- (a deleted customer's history must survive the delete — see
    -- CustomerAuditLog.sql), so FirstName/LastName come back NULL for
    -- a customer that no longer exists rather than dropping that row.
    SELECT
        l.CustomerAuditLogId,
        l.CustomerId,
        c.FirstName,
        c.LastName,
        l.PerformedBy,
        l.ActionType,
        l.Details,
        l.OccurredAt,
        COUNT(*) OVER() AS TotalCount
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

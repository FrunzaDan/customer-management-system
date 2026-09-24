CREATE PROCEDURE [dbo].[CustomerAuditLog_List]
    @PageNumber INT = 1,
    @PageSize INT = 20
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Result set 1: the total, counted on its own so it's right even when the
    -- requested page has no rows (past the last page, or the log was just cleared).
    -- A COUNT(*) OVER() column on the page query only carries it when a row comes back.
    SELECT COUNT(*) AS TotalCount
    FROM dbo.CustomerAuditLog;

    -- Result set 2: the page, newest first.
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

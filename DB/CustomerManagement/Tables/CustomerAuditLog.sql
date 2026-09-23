CREATE TABLE [dbo].[CustomerAuditLog]
(
    [CustomerAuditLogId] INT IDENTITY (1, 1) NOT NULL,
    [CustomerId] UNIQUEIDENTIFIER NOT NULL,
    -- The Merchant.Username of whoever performed the action.
    [PerformedBy] NVARCHAR (50) NOT NULL,
    -- A fixed set of values (the API's AuditAction enum), so a short VARCHAR with a CHECK
    -- rather than free text.
    [ActionType] VARCHAR (20) NOT NULL,
    [Details] NVARCHAR (500) NULL,
    -- UTC; defaulted here so no proc has to remember to supply it.
    [OccurredAt] DATETIME2 (3) NOT NULL CONSTRAINT [DF_CustomerAuditLog_OccurredAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_CustomerAuditLog] PRIMARY KEY CLUSTERED ([CustomerAuditLogId]),
    CONSTRAINT [CK_CustomerAuditLog_ActionType] CHECK ([ActionType] IN
        ('Created', 'Edited', 'Deactivated', 'Reactivated', 'Deleted', 'Purchased'))
);
GO

-- No FK to Customer: audit history must survive a customer being hard-deleted
-- (see Customer_Delete / ai_docs/database.md), so it's a plain column, indexed for
-- the per-customer lookup CustomerAuditLog_ListByCustomer does — keyed in that proc's
-- ORDER BY order so the "newest first" listing is read straight off the index with no sort.
CREATE INDEX [IX_CustomerAuditLog_CustomerId_OccurredAt_CustomerAuditLogId]
    ON [dbo].[CustomerAuditLog] ([CustomerId], [OccurredAt] DESC, [CustomerAuditLogId] DESC);
GO

-- Supports CustomerAuditLog_List's global, unfiltered "newest first" scan
-- across every customer — the index above only helps once a CustomerId is
-- known, which the global admin view doesn't have.
CREATE INDEX [IX_CustomerAuditLog_OccurredAt_CustomerAuditLogId]
    ON [dbo].[CustomerAuditLog] ([OccurredAt] DESC, [CustomerAuditLogId] DESC);

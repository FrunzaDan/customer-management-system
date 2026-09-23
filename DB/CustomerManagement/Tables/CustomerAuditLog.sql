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
    [OccurredAt] DATETIME2 (3) NOT NULL
        CONSTRAINT [DF_CustomerAuditLog_OccurredAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_CustomerAuditLog] PRIMARY KEY CLUSTERED ([CustomerAuditLogId]),
    CONSTRAINT [CK_CustomerAuditLog_ActionType] CHECK ([ActionType] IN
        ('Created', 'Edited', 'Deactivated', 'Reactivated', 'Deleted', 'Purchased'))
);
GO

-- No FK to Customer: audit history must survive a customer being hard-deleted
-- (see Customer_Delete / ai_docs/database.md), so it's a plain
-- column, indexed for the per-customer lookup CustomerAuditLog_ListByCustomer does.
CREATE INDEX [IX_CustomerAuditLog_CustomerId]
    ON [dbo].[CustomerAuditLog] ([CustomerId]);
GO

-- Supports CustomerAuditLog_List's global, unfiltered "newest first" scan
-- across every customer — the index above only helps once a CustomerId is
-- known, which the global admin view doesn't have.
CREATE INDEX [IX_CustomerAuditLog_OccurredAt_CustomerAuditLogId]
    ON [dbo].[CustomerAuditLog] ([OccurredAt] DESC, [CustomerAuditLogId] DESC);

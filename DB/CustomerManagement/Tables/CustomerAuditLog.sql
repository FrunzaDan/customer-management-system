CREATE TABLE [dbo].[CustomerAuditLog]
(
    [CustomerAuditLogId] INT IDENTITY (1, 1) NOT NULL,
    [CustomerId] UNIQUEIDENTIFIER NOT NULL,
    [PerformedBy] NVARCHAR (50) NOT NULL,
    [ActionType] VARCHAR (20) NOT NULL,
    [Details] NVARCHAR (500) NULL,
    [OccurredAt] DATETIME2 (3) NOT NULL
        CONSTRAINT [DF_CustomerAuditLog_OccurredAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_CustomerAuditLog] PRIMARY KEY CLUSTERED ([CustomerAuditLogId]),
    CONSTRAINT [CK_CustomerAuditLog_ActionType] CHECK ([ActionType] IN
        ('Created', 'Edited', 'Deactivated', 'Reactivated', 'Deleted', 'Purchased'))
);
GO

CREATE INDEX [IX_CustomerAuditLog_CustomerId_OccurredAt_CustomerAuditLogId]
    ON [dbo].[CustomerAuditLog] ([CustomerId], [OccurredAt] DESC, [CustomerAuditLogId] DESC);
GO

CREATE INDEX [IX_CustomerAuditLog_OccurredAt_CustomerAuditLogId]
    ON [dbo].[CustomerAuditLog] ([OccurredAt] DESC, [CustomerAuditLogId] DESC);

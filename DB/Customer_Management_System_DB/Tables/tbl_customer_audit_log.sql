CREATE TABLE [dbo].[tbl_customer_audit_log]
(
    [audit_id] INT IDENTITY (1, 1) NOT NULL,
    [customer_guid] UNIQUEIDENTIFIER NOT NULL,
    [merchant_id] NVARCHAR (50) NOT NULL,
    -- A fixed set of values (the API's AuditAction enum), so a short VARCHAR with a CHECK
    -- rather than free text.
    [action] VARCHAR (20) NOT NULL,
    [details] NVARCHAR (500) NULL,
    [action_Date] DATETIME2 (0) NOT NULL
        CONSTRAINT [DF_tbl_customer_audit_log_action_Date] DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (audit_id),
    CONSTRAINT [CK_tbl_customer_audit_log_action] CHECK ([action] IN
        ('Created', 'Edited', 'Deactivated', 'Reactivated', 'Deleted', 'Purchased'))
);
GO

-- No FK to tbl_customers: audit history must survive a customer being hard-deleted
-- (see usp_deleteCustomer / ai_docs/database.md), so it's a plain
-- column, indexed for the per-customer lookup usp_getCustomerAuditLog does.
CREATE INDEX [IX_tbl_customer_audit_log_customer_guid]
    ON [dbo].[tbl_customer_audit_log] ([customer_guid]);
GO

-- Supports usp_getAllCustomerAuditLog's global, unfiltered "newest first" scan
-- across every customer — the index above only helps once a customer_guid is
-- known, which the global admin view doesn't have.
CREATE INDEX [IX_tbl_customer_audit_log_action_Date]
    ON [dbo].[tbl_customer_audit_log] ([action_Date] DESC, [audit_id] DESC);

CREATE TABLE [dbo].[tbl_customers]
(
    -- A real 16-byte UNIQUEIDENTIFIER (not the textual form in an NVARCHAR): a quarter of the
    -- size in this table and in every table/index that references it, compared by value (so
    -- case and {braces} don't matter), and impossible to store malformed. Generated here, by
    -- NEWSEQUENTIALID(), rather than by the API: each new key sorts after the previous one, so
    -- inserts append to the end of the clustered index instead of splitting random pages the
    -- way a random Guid.NewGuid() key does. usp_createCustomer hands the new value back.
    [PK_customer_guid] UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT [DF_tbl_customers_PK_customer_guid] DEFAULT NEWSEQUENTIALID(),
    [first_name] NVARCHAR (50) NOT NULL,
    [last_name] NVARCHAR (50) NOT NULL,
    -- NOT NULL (not just the UQ_ constraints below): SQL Server treats every NULL as
    -- distinct under UNIQUE, so a NULL email/msisdn would silently bypass both the unique
    -- constraint and usp_createCustomer's own duplicate pre-check (`= NULL` never matches).
    -- 254 is the longest address SMTP can actually deliver to (RFC 5321's path limit).
    [email] NVARCHAR (254) NOT NULL,
    -- Digits only (the API's MSISDN regex), so VARCHAR, not NVARCHAR; 15 is E.164's maximum.
    -- Anything compared against it must be VARCHAR too — an NVARCHAR parameter would force a
    -- conversion of the column and turn UQ_tbl_customers_msisdn seeks into scans.
    [msisdn] VARCHAR (15) NOT NULL,
    -- 0 = Not declared, 1 = Male, 2 = Female (see ai_docs/angular-frontend.md).
    [gender] TINYINT NOT NULL
        CONSTRAINT [DF_tbl_customers_gender] DEFAULT 0,
    [birthdate] DATE NULL,
    -- 1901 = active, 1903 = deactivated, 1904 = test (see ai_docs/database.md).
    [customer_Status] SMALLINT NOT NULL
        CONSTRAINT [DF_tbl_customers_customer_Status] DEFAULT 1901,
    -- UTC (SYSUTCDATETIME), not server-local GETDATE(): the API marks every timestamp it
    -- reads as UTC, and the UI converts it to the viewer's own time zone.
    [creation_Date] DATETIME2 (0) NOT NULL
        CONSTRAINT [DF_tbl_customers_creation_Date] DEFAULT SYSUTCDATETIME(),
    [interaction_Date] DATETIME2 (0) NOT NULL
        CONSTRAINT [DF_tbl_customers_interaction_Date] DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (PK_customer_guid),
    CONSTRAINT [UQ_tbl_customers_email] UNIQUE ([email]),
    CONSTRAINT [UQ_tbl_customers_msisdn] UNIQUE ([msisdn]),
    CONSTRAINT [CK_tbl_customers_gender] CHECK ([gender] IN (0, 1, 2)),
    CONSTRAINT [CK_tbl_customers_customer_Status] CHECK ([customer_Status] IN (1901, 1903, 1904))
);
GO

-- Supports usp_getCustomers' default (no @SearchTerm) listing and its 'name' sort —
-- the common, unfiltered page-load path. Doesn't help the LIKE '%...%' search branches
-- (a leading wildcard can't seek any index), only the plain listing/sort case.
CREATE INDEX [IX_tbl_customers_last_first]
    ON [dbo].[tbl_customers] ([last_name], [first_name]);

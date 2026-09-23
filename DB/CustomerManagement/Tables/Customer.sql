CREATE TABLE [dbo].[Customer]
(
    -- A real 16-byte UNIQUEIDENTIFIER (not the textual form in an NVARCHAR): a quarter of the
    -- size in this table and in every table/index that references it, compared by value (so
    -- case and {braces} don't matter), and impossible to store malformed. Generated here, by
    -- NEWSEQUENTIALID(), rather than by the API: each new key sorts after the previous one, so
    -- inserts append to the end of the clustered index instead of splitting random pages the
    -- way a random Guid.NewGuid() key does. Customer_Create hands the new value back.
    [CustomerId] UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT [DF_Customer_CustomerId] DEFAULT NEWSEQUENTIALID(),
    [FirstName] NVARCHAR (50) NOT NULL,
    [LastName] NVARCHAR (50) NOT NULL,
    -- NOT NULL (not just the UQ_ constraints below): SQL Server treats every NULL as
    -- distinct under UNIQUE, so a NULL Email/PhoneNumber would silently bypass both the unique
    -- constraint and Customer_Create's own duplicate pre-check (`= NULL` never matches).
    -- 254 is the longest address SMTP can actually deliver to (RFC 5321's path limit).
    [Email] NVARCHAR (254) NOT NULL,
    -- The MSISDN: digits only (the API's MSISDN regex), so VARCHAR, not NVARCHAR; 15 is
    -- E.164's maximum. Anything compared against it must be VARCHAR too — an NVARCHAR
    -- parameter would force a conversion of the column and turn UQ_Customer_PhoneNumber
    -- seeks into scans.
    [PhoneNumber] VARCHAR (15) NOT NULL,
    -- 0 = Not declared, 1 = Male, 2 = Female (see ai_docs/angular-frontend.md).
    [Gender] TINYINT NOT NULL
        CONSTRAINT [DF_Customer_Gender] DEFAULT 0,
    [BirthDate] DATE NULL,
    -- 1901 = active, 1903 = deactivated, 1904 = test (see ai_docs/database.md).
    [StatusCode] SMALLINT NOT NULL
        CONSTRAINT [DF_Customer_StatusCode] DEFAULT 1901,
    -- UTC (SYSUTCDATETIME), not server-local GETDATE(): the API marks every timestamp it
    -- reads as UTC, and the UI converts it to the viewer's own time zone.
    [CreatedAt] DATETIME2 (0) NOT NULL
        CONSTRAINT [DF_Customer_CreatedAt] DEFAULT SYSUTCDATETIME(),
    [LastInteractionAt] DATETIME2 (0) NOT NULL
        CONSTRAINT [DF_Customer_LastInteractionAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_Customer] PRIMARY KEY ([CustomerId]),
    CONSTRAINT [UQ_Customer_Email] UNIQUE ([Email]),
    CONSTRAINT [UQ_Customer_PhoneNumber] UNIQUE ([PhoneNumber]),
    CONSTRAINT [CK_Customer_Gender] CHECK ([Gender] IN (0, 1, 2)),
    CONSTRAINT [CK_Customer_StatusCode] CHECK ([StatusCode] IN (1901, 1903, 1904))
);
GO

-- Supports Customer_List's default (no @SearchTerm) listing and its 'name' sort —
-- the common, unfiltered page-load path. Doesn't help the LIKE '%...%' search branches
-- (a leading wildcard can't seek any index), only the plain listing/sort case.
CREATE INDEX [IX_Customer_LastName_FirstName]
    ON [dbo].[Customer] ([LastName], [FirstName]);

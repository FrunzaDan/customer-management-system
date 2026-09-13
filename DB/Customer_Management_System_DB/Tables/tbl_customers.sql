CREATE TABLE [dbo].[tbl_customers]
(
    [PK_customer_guid] NVARCHAR (50) NOT NULL,
    [first_name] NVARCHAR (50) NULL,
    [last_name] NVARCHAR (50) NULL,
    -- NOT NULL (not just the UQ_ constraints below): SQL Server treats every NULL as
    -- distinct under UNIQUE, so a NULL email/msisdn would silently bypass both the unique
    -- constraint and usp_createCustomer's own duplicate pre-check (`= NULL` never matches).
    [email] NVARCHAR (50) NOT NULL,
    [msisdn] NVARCHAR (50) NOT NULL,
    [gender] INT NULL,
    [birthdate] NVARCHAR (50) NULL,
    [customer_Status] INT NULL,
    [creation_Date] NVARCHAR (50) NULL,
    [interaction_Date] NVARCHAR (50) NULL,
    PRIMARY KEY (PK_customer_guid),
    CONSTRAINT [UQ_tbl_customers_email] UNIQUE ([email]),
    CONSTRAINT [UQ_tbl_customers_msisdn] UNIQUE ([msisdn])
);
GO

-- Supports usp_getCustomers' default (no @SearchTerm) listing and its 'name' sort —
-- the common, unfiltered page-load path. Doesn't help the LIKE '%...%' search branches
-- (a leading wildcard can't seek any index), only the plain listing/sort case.
CREATE INDEX [IX_tbl_customers_last_first]
    ON [dbo].[tbl_customers] ([last_name], [first_name]);

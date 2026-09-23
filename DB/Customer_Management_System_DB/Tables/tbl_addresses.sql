CREATE TABLE [dbo].[tbl_addresses] (
    [FK_customer_guid] UNIQUEIDENTIFIER NOT NULL,
    -- NOT NULL: every address field is required by both the API and the UI.
    [country]          NVARCHAR (100) NOT NULL,
    [county]           NVARCHAR (100) NOT NULL,
    [zip_code]         NVARCHAR (50) NOT NULL,
    [town]             NVARCHAR (50) NOT NULL,
    [street]           NVARCHAR (100) NOT NULL,
    [number]           NVARCHAR (50) NOT NULL,
    -- The customer's GUID is the natural primary key of a 1:1 child row. As a clustered PK
    -- it both enforces the 1:1 customer-to-address relationship every proc assumes and gives
    -- the FK column its index (a FK doesn't index its own referencing column) — without it
    -- every customer read/write (usp_getCustomer/usp_getCustomers' INNER JOIN,
    -- usp_editCustomer, usp_deleteCustomer) would scan this table. The tighter (seek, not
    -- scan) locking also reduces the deadlock surface between usp_createCustomer and
    -- usp_deleteCustomer's opposite table-access order.
    CONSTRAINT [PK_tbl_addresses] PRIMARY KEY ([FK_customer_guid]),
    CONSTRAINT [FK_tbl_addresses_tbl_customers]
        FOREIGN KEY (FK_customer_guid) REFERENCES tbl_customers(PK_customer_guid)
);

CREATE TABLE [dbo].[tbl_addresses] (
    [FK_customer_guid] NVARCHAR (50)  NOT NULL,
    [country]          NVARCHAR (100) NULL,
    [county]           NVARCHAR (100) NULL,
    [zip_code]         NVARCHAR (50) NULL,
    [town]             NVARCHAR (50) NULL,
    [street]           NVARCHAR (100) NULL,
    [number]           NVARCHAR (50) NULL,
    -- A FK doesn't auto-index its own (referencing) column — without this, every
    -- customer read/write (usp_getCustomer/usp_getCustomers' INNER JOIN, usp_editCustomer,
    -- usp_deleteCustomer) does a full scan of this table. It also enforces the 1:1
    -- customer-to-address relationship every proc already assumes but nothing previously
    -- guaranteed, and the tighter (seek, not scan) locking here reduces the deadlock
    -- surface between usp_createCustomer and usp_deleteCustomer's opposite table-access order.
    CONSTRAINT [UQ_tbl_addresses_FK_customer_guid] UNIQUE ([FK_customer_guid]),
    FOREIGN KEY (FK_customer_guid) REFERENCES tbl_customers(PK_customer_guid)
    ON UPDATE CASCADE
);

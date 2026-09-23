CREATE TABLE [dbo].[CustomerAddress] (
    [CustomerId]   UNIQUEIDENTIFIER NOT NULL,
    -- NOT NULL: every address field is required by both the API and the UI.
    [Country]      NVARCHAR (100) NOT NULL,
    [County]       NVARCHAR (100) NOT NULL,
    [PostalCode]   NVARCHAR (50) NOT NULL,
    [City]         NVARCHAR (50) NOT NULL,
    [Street]       NVARCHAR (100) NOT NULL,
    [StreetNumber] NVARCHAR (50) NOT NULL,
    -- The customer's key is the natural primary key of a 1:1 child row. As a clustered PK
    -- it both enforces the 1:1 customer-to-address relationship every proc assumes and gives
    -- the FK column its index (a FK doesn't index its own referencing column) — without it
    -- every customer read/write (Customer_Get/Customer_List's INNER JOIN, Customer_Update,
    -- Customer_Delete) would scan this table. The tighter (seek, not scan) locking also
    -- reduces the deadlock surface between Customer_Create and Customer_Delete's opposite
    -- table-access order.
    CONSTRAINT [PK_CustomerAddress] PRIMARY KEY ([CustomerId]),
    CONSTRAINT [FK_CustomerAddress_Customer]
        FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Customer] ([CustomerId])
);

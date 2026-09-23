CREATE TABLE [dbo].[CustomerPurchase]
(
    -- Surrogate key: the same customer can buy the same product more than once, so
    -- (customer, product) is not unique and can't be the primary key.
    [CustomerPurchaseId] INT IDENTITY (1, 1) NOT NULL,
    [CustomerId] UNIQUEIDENTIFIER NOT NULL,
    [ProductId] UNIQUEIDENTIFIER NOT NULL,
    [PurchasedAt] DATETIME2 (0) NOT NULL
        CONSTRAINT [DF_CustomerPurchase_PurchasedAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_CustomerPurchase] PRIMARY KEY ([CustomerPurchaseId]),
    -- Unlike CustomerAuditLog, purchases are real FKs: a purchase row is meaningless
    -- without its customer, so Customer_Delete deletes them together with the customer
    -- (see that proc) rather than letting them outlive it.
    CONSTRAINT [FK_CustomerPurchase_Customer]
        FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Customer] ([CustomerId]),
    CONSTRAINT [FK_CustomerPurchase_Product]
        FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Product] ([ProductId])
);
GO

-- A FK doesn't index its referencing column. This backs CustomerPurchase_ListByCustomer's
-- per-customer, newest-first lookup and Customer_Delete's per-customer delete.
CREATE INDEX [IX_CustomerPurchase_CustomerId_PurchasedAt_CustomerPurchaseId]
    ON [dbo].[CustomerPurchase] ([CustomerId], [PurchasedAt] DESC, [CustomerPurchaseId] DESC);
GO

-- Backs Product_GetDetails' per-product "who bought this, and when" lookup.
CREATE INDEX [IX_CustomerPurchase_ProductId_PurchasedAt_CustomerPurchaseId]
    ON [dbo].[CustomerPurchase] ([ProductId], [PurchasedAt] DESC, [CustomerPurchaseId] DESC);

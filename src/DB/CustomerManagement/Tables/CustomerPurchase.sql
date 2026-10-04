CREATE TABLE [dbo].[CustomerPurchase]
(
    [CustomerPurchaseId] INT IDENTITY (1, 1) NOT NULL,
    [CustomerId] UNIQUEIDENTIFIER NOT NULL,
    [ProductId] UNIQUEIDENTIFIER NOT NULL,
    [PurchasedAt] DATETIME2 (3) NOT NULL
        CONSTRAINT [DF_CustomerPurchase_PurchasedAt] DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_CustomerPurchase] PRIMARY KEY CLUSTERED ([CustomerPurchaseId]),
    CONSTRAINT [FK_CustomerPurchase_Customer]
        FOREIGN KEY ([CustomerId]) REFERENCES [dbo].[Customer] ([CustomerId]),
    CONSTRAINT [FK_CustomerPurchase_Product]
        FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Product] ([ProductId])
);
GO

CREATE INDEX [IX_CustomerPurchase_CustomerId_PurchasedAt_CustomerPurchaseId]
    ON [dbo].[CustomerPurchase] ([CustomerId], [PurchasedAt] DESC, [CustomerPurchaseId] DESC);
GO

CREATE INDEX [IX_CustomerPurchase_ProductId_PurchasedAt_CustomerPurchaseId]
    ON [dbo].[CustomerPurchase] ([ProductId], [PurchasedAt] DESC, [CustomerPurchaseId] DESC);

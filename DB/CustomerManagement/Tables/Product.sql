CREATE TABLE [dbo].[Product]
(
    [ProductId] UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT [DF_Product_ProductId] DEFAULT NEWSEQUENTIALID(),
    [Name] NVARCHAR (100) NOT NULL,
    [Category] NVARCHAR (50) NOT NULL,
    [Description] NVARCHAR (500) NULL,
    [Price] DECIMAL (12, 2) NOT NULL,
    [InitialQuantity] INT NOT NULL,
    [QuantityOnHand] INT NOT NULL,
    [Warehouse] NVARCHAR (100) NOT NULL,
    CONSTRAINT [PK_Product] PRIMARY KEY CLUSTERED ([ProductId]),
    CONSTRAINT [CK_Product_Price] CHECK ([Price] >= 0),
    CONSTRAINT [CK_Product_QuantityOnHand] CHECK ([QuantityOnHand] >= 0),
    CONSTRAINT [CK_Product_QuantityOnHand_InitialQuantity] CHECK ([QuantityOnHand] <= [InitialQuantity])
);
GO

CREATE INDEX [IX_Product_Category_Name]
    ON [dbo].[Product] ([Category], [Name]);

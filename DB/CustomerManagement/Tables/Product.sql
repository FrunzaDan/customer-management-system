CREATE TABLE [dbo].[Product]
(
    -- Same reasoning as Customer.CustomerId: a real UNIQUEIDENTIFIER, generated
    -- sequentially here; Product_Create hands the new value back.
    [ProductId] UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT [DF_Product_ProductId] DEFAULT NEWSEQUENTIALID(),
    [Name] NVARCHAR (100) NOT NULL,
    [Category] NVARCHAR (50) NOT NULL,
    [Description] NVARCHAR (500) NULL,
    [Price] DECIMAL (12, 2) NOT NULL,
    -- Units originally stocked. Never changes after seeding.
    [InitialQuantity] INT NOT NULL,
    -- Units left on hand. CustomerPurchase_Create decrements this; the CHECKs below are the
    -- DB-level backstop so it can never go negative or exceed what was stocked, even if a
    -- caller bypasses the proc. "Sold" is derived as InitialQuantity - QuantityOnHand
    -- (see Product_List) rather than counted from CustomerPurchase, so it stays
    -- consistent with "left" even after a customer (and their purchase rows) is deleted.
    [QuantityOnHand] INT NOT NULL,
    -- The warehouse (depot) the stock is held in.
    [Warehouse] NVARCHAR (100) NOT NULL,
    CONSTRAINT [PK_Product] PRIMARY KEY CLUSTERED ([ProductId]),
    CONSTRAINT [CK_Product_Price] CHECK ([Price] >= 0),
    CONSTRAINT [CK_Product_QuantityOnHand] CHECK ([QuantityOnHand] >= 0),
    CONSTRAINT [CK_Product_QuantityOnHand_InitialQuantity] CHECK ([QuantityOnHand] <= [InitialQuantity])
);
GO

-- Supports Product_List's "grouped by category, then name" listing.
CREATE INDEX [IX_Product_Category_Name]
    ON [dbo].[Product] ([Category], [Name]);

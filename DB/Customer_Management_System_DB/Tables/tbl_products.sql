CREATE TABLE [dbo].[tbl_products]
(
    [PK_product_guid] NVARCHAR (50) NOT NULL,
    [product_name] NVARCHAR (100) NOT NULL,
    [category] NVARCHAR (50) NOT NULL,
    [comment] NVARCHAR (500) NULL,
    [price] DECIMAL (10, 2) NOT NULL,
    -- Units originally stocked. Never changes after seeding.
    [inventory_quantity] INT NOT NULL,
    -- Units left on hand. usp_purchaseProduct decrements this; the CHECKs below are the
    -- DB-level backstop so it can never go negative or exceed what was stocked, even if a
    -- caller bypasses the proc. "Sold" is derived as inventory_quantity - stock_quantity
    -- (see usp_getProducts) rather than counted from tbl_customer_purchases, so it stays
    -- consistent with "left" even after a customer (and their purchase rows) is deleted.
    [stock_quantity] INT NOT NULL,
    -- The depot (warehouse) the stock is held in.
    [depot] NVARCHAR (100) NOT NULL,
    PRIMARY KEY (PK_product_guid),
    CONSTRAINT [CK_tbl_products_price] CHECK ([price] >= 0),
    CONSTRAINT [CK_tbl_products_stock_quantity] CHECK ([stock_quantity] >= 0),
    CONSTRAINT [CK_tbl_products_inventory_quantity] CHECK ([stock_quantity] <= [inventory_quantity])
);
GO

-- Supports usp_getProducts' "grouped by category, then name" listing.
CREATE INDEX [IX_tbl_products_category_name]
    ON [dbo].[tbl_products] ([category], [product_name]);

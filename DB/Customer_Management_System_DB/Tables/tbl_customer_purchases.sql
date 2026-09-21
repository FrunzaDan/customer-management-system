CREATE TABLE [dbo].[tbl_customer_purchases]
(
    -- Surrogate key: the same customer can buy the same product more than once, so
    -- (customer, product) is not unique and can't be the primary key.
    [purchase_id] INT IDENTITY (1, 1) NOT NULL,
    [FK_customer_guid] NVARCHAR (50) NOT NULL,
    [FK_product_guid] NVARCHAR (50) NOT NULL,
    [purchase_date] DATETIME NOT NULL,
    PRIMARY KEY (purchase_id),
    -- Unlike tbl_customer_audit_log, purchases are real FKs: a purchase row is meaningless
    -- without its customer, so usp_deleteCustomer deletes them together with the customer
    -- (see that proc) rather than letting them outlive it.
    FOREIGN KEY (FK_customer_guid) REFERENCES tbl_customers(PK_customer_guid),
    FOREIGN KEY (FK_product_guid) REFERENCES tbl_products(PK_product_guid)
);
GO

-- A FK doesn't index its referencing column. This backs usp_getCustomerPurchases'
-- per-customer, newest-first lookup and usp_deleteCustomer's per-customer delete.
CREATE INDEX [IX_tbl_customer_purchases_customer_date]
    ON [dbo].[tbl_customer_purchases] ([FK_customer_guid], [purchase_date] DESC, [purchase_id] DESC);
GO

-- Backs usp_getProductDetails' per-product "who bought this, and when" lookup.
CREATE INDEX [IX_tbl_customer_purchases_product_date]
    ON [dbo].[tbl_customer_purchases] ([FK_product_guid], [purchase_date] DESC, [purchase_id] DESC);

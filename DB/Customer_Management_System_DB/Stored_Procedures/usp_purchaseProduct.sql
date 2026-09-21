CREATE PROCEDURE [dbo].[usp_purchaseProduct]
    @var_CustomerGuid NVARCHAR(50),
    @var_ProductGuid NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @result INT;
    DECLARE @message NVARCHAR(255);
    DECLARE @productName NVARCHAR(100) = NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM tbl_customers
        WHERE PK_customer_guid = @var_CustomerGuid
    )
    BEGIN
        SET @result = 404;
        SET @message = 'Customer not found.';
    END
    ELSE IF EXISTS (
        SELECT 1
        FROM tbl_customers
        WHERE PK_customer_guid = @var_CustomerGuid AND customer_Status = 1903
    )
    BEGIN
        SET @result = 409;
        SET @message = 'A deactivated customer cannot make purchases.';
    END
    ELSE IF NOT EXISTS (
        SELECT 1
        FROM tbl_products
        WHERE PK_product_guid = @var_ProductGuid
    )
    BEGIN
        SET @result = 404;
        SET @message = 'Product not found.';
    END
    ELSE
    BEGIN
        SELECT @productName = product_name
        FROM tbl_products
        WHERE PK_product_guid = @var_ProductGuid;

        -- The stock decrement and the purchase row must succeed together: a decremented
        -- stock with no purchase row (or the reverse) would leave the two tables disagreeing.
        BEGIN TRY
            BEGIN TRANSACTION;

            -- The "stock_quantity > 0" guard sits in the UPDATE itself (not a separate
            -- read-then-write), so two concurrent buyers of the last unit can't both succeed.
            UPDATE tbl_products
            SET stock_quantity = stock_quantity - 1
            WHERE PK_product_guid = @var_ProductGuid AND stock_quantity > 0;

            IF @@ROWCOUNT = 0
            BEGIN
                ROLLBACK TRANSACTION;

                SET @result = 409;
                SET @message = 'Product is out of stock.';
            END
            ELSE
            BEGIN
                INSERT INTO tbl_customer_purchases (FK_customer_guid, FK_product_guid, purchase_date)
                VALUES (@var_CustomerGuid, @var_ProductGuid, GETDATE());

                COMMIT TRANSACTION;

                SET @result = 0;
                SET @message = 'Purchase recorded successfully.';
            END
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0
                ROLLBACK TRANSACTION;

            SET @result = 500;
            SET @message = CONCAT('Failed to record purchase: ', ERROR_MESSAGE());
        END CATCH
    END

    -- product_name rides along on the usual (result, message) row so the API can put it in
    -- the audit-log entry without a second query; only meaningful when result = 0.
    SELECT @result AS result, @message AS message, @productName AS product_name;
END

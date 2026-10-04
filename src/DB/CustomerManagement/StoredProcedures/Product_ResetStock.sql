-- Demo helper: puts every product back to the stock it started with. Past
-- purchases are kept, so "sold" drops back to zero while purchase history stays.
CREATE PROCEDURE [dbo].[Product_ResetStock]
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Result INT;
    DECLARE @Message NVARCHAR(255);
    DECLARE @ResetCount INT;

    UPDATE dbo.Product
    SET QuantityOnHand = InitialQuantity
    WHERE QuantityOnHand <> InitialQuantity;

    SET @ResetCount = @@ROWCOUNT;
    SET @Result = 0;
    SET @Message = CONCAT('Stock reset for ', @ResetCount, ' products.');

    SELECT @Result AS Result, @Message AS Message;
END

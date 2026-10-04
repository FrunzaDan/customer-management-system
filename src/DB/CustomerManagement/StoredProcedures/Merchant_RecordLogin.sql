CREATE PROCEDURE [dbo].[Merchant_RecordLogin]
    @Username NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    UPDATE dbo.Merchant
    SET LastInteractionAt = SYSUTCDATETIME()
    WHERE Username = @Username;
END;

CREATE PROCEDURE [dbo].[Merchant_GetAuthData]
    @Username NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    UPDATE dbo.Merchant
    SET LastInteractionAt = SYSUTCDATETIME()
    WHERE Username = @Username;

    SELECT
        PasswordHash,
        PasswordSalt,
        RoleCode
    FROM dbo.Merchant
    WHERE Username = @Username;
END;

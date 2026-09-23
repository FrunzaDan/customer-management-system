CREATE PROCEDURE [dbo].[usp_getMerchantAuthData]
    @var_MerchantID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE tbl_merchants
    SET last_interaction = SYSUTCDATETIME()
    WHERE merchant_id = @var_MerchantID;

    SELECT
        merchant_password AS password_hash,
        merchant_password_salt AS password_salt,
        merchant_role
    FROM tbl_merchants
    WHERE merchant_id = @var_MerchantID;
END;

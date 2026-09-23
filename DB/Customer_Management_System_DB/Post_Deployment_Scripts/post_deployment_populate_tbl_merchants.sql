IF NOT EXISTS (
    SELECT 1
    FROM tbl_merchants
    WHERE merchant_id = 'TestMerchantID'
)
BEGIN
    -- Password: 'Merchant123', hashed with PBKDF2-HMACSHA256 (100,000 iterations) and the salt below,
    -- to match CustomerManagementSystem.DataAccess.DBConnection.PasswordHasher.
    DECLARE @merchantPasswordSalt BINARY(16) = 0x4748E8CAF8A747E38E080DC80A9C073E;
    DECLARE @hashedMerchantPassword BINARY(32) = 0x288C1A2D4D125CD76FD19CDC20845133320293788042D09DEFB52EBA49032268;
    DECLARE @currDate DATETIME2(0) = SYSUTCDATETIME();

    INSERT INTO dbo.tbl_merchants (
        merchant_id,
        merchant_password,
        merchant_password_salt,
        merchant_role,
        last_interaction
    )
    VALUES (
        'TestMerchantID',
        @hashedMerchantPassword,
        @merchantPasswordSalt,
        1801,
        @currDate
    );
END

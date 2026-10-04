IF NOT EXISTS (
    SELECT 1
    FROM dbo.Merchant
    WHERE Username = 'TestMerchantID'
)
BEGIN
    DECLARE @PasswordSalt BINARY(16) = 0x4748E8CAF8A747E38E080DC80A9C073E;
    DECLARE @PasswordHash BINARY(32) = 0x288C1A2D4D125CD76FD19CDC20845133320293788042D09DEFB52EBA49032268;
    DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();

    INSERT INTO dbo.Merchant (
        Username,
        PasswordHash,
        PasswordSalt,
        RoleCode,
        LastInteractionAt
    )
    VALUES (
        'TestMerchantID',
        @PasswordHash,
        @PasswordSalt,
        1801,
        @Now
    );
END

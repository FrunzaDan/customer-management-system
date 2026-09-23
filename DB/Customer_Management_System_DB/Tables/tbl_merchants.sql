CREATE TABLE [dbo].[tbl_merchants] (
    [merchant_id]      NVARCHAR (50) NOT NULL,
    [merchant_password]    BINARY(32) NOT NULL,
    [merchant_password_salt] BINARY(16) NOT NULL,
    -- 1801 = the only role currently in use (see ai_docs/api.md).
    [merchant_role]      SMALLINT      NOT NULL,
    [last_interaction] DATETIME2 (0)  NULL,
    PRIMARY KEY (merchant_id)
);
